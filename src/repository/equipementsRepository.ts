import { en_equipement_physique } from '@prisma/client'

import { miseAJourInventaireRepository, supprimerInventaireRepository } from './inventairesRepository'
import prisma from '../../prisma/db'

type ApiError = Readonly<{
  code: string
  message: string
  status: number
  timestamp: string
}>

type ApiErrorJava = Readonly<{
  type: string
  title: string
  status: number
  detail: string
  instance: string
  properties: string
}>

export type EquipementPhysique = Readonly<{
  dureeDeVie: number
  heureUtilisation: number
  modele: string
  quantite: number
  type: string
}>

export type EquipementPhysiqueModel = Readonly<{
  duree_vie_defaut: number
  modeles: readonly {
    ref_correspondance_ref_eqp: Readonly<{
      modele_equipement_source: string
    }>
  }[]
  type: string
}>

export async function recupererLesReferentielsEquipementsRepository(): Promise<EquipementPhysiqueModel[]> {
  return await prisma.ref_type_equipement.findMany({
    select: {
      duree_vie_defaut: true,
      modeles: {
        select: {
          ref_correspondance_ref_eqp: {
            select: {
              modele_equipement_source: true,
            },
          },
        },
      },
      type: true,
    },
  })
}

export async function recupererLesEquipementsEnregistresRepository(nomEtablissement: string, nomInventaire: string): Promise<en_equipement_physique[]> {
  return await prisma.en_equipement_physique.findMany({
    where: { nom_lot: nomInventaire, nom_organisation: nomEtablissement },
  })
}

export async function enregistrerUnInventaireNonCalculeRepository(nomEtablissement: string, nomInventaire: string, modeles: EquipementPhysique[]) {
  const dateInventaire = await supprimerInventaireRepository(nomEtablissement, nomInventaire)
  await ajouterEquipementsPhysiquesRepository(dateInventaire, nomEtablissement, nomInventaire, modeles)
}

export async function creerUnInventaireRepository(nomEtablissement: string, nomInventaire: string, modeles: EquipementPhysique[]) {
  const dateInventaire = await supprimerInventaireRepository(nomEtablissement, nomInventaire)

  const isAjouter = await ajouterEquipementsPhysiquesRepository(dateInventaire, nomEtablissement, nomInventaire, modeles)

  if (isAjouter) {
    await lancerLeCalculRepository(nomEtablissement, nomInventaire)
  }
}

async function ajouterEquipementsPhysiquesRepository(
  dateInventaire: Date,
  nomEtablissement: string,
  nomInventaire: string,
  modeles: EquipementPhysique[]
): Promise<boolean> {
  const dateRetrait = new Date().toISOString().split('T')[0]
  const urlEntrees = new URL(`${process.env.EXPOSITION_DONNEES_ENTREES_URL}/entrees/csv`)
  urlEntrees.searchParams.append('nomLot', nomInventaire)
  urlEntrees.searchParams.append('nomOrganisation', nomEtablissement)
  urlEntrees.searchParams.append('dateLot', dateInventaire.toISOString().split('T')[0])

  let data = 'nomEquipementPhysique;modele;quantite;nomCourtDatacenter;dateAchat;dateRetrait;type;statut;paysDUtilisation;consoElecAnnuelle;utilisateur;nomSourceDonnee;nomEntite;nbCoeur;nbJourUtiliseAn;goTelecharge;modeUtilisation;tauxUtilisation\n'
  for (const modele of modeles) {
    const dateAchat = new Date()
    dateAchat.setFullYear(dateAchat.getFullYear() - modele.dureeDeVie)

    data += `;${modele.modele};${modele.quantite};;${dateAchat.toISOString().split('T')[0]};${dateRetrait};${modele.type};;France;;;;;;365;;;${modele.heureUtilisation / 24}\n`
  }

  const responseEntrees = await fetch(urlEntrees, {
    body: `-----------------------------40013669463662053215375107514\r\nContent-Disposition: form-data; name="csvEquipementPhysique"; filename="EquipementPhysique.csv"\r\nContent-Type: text/csv\r\n\r\n${data}\n\r\n-----------------------------40013669463662053215375107514--\r\n`,
    headers: {
      'Content-Type': 'multipart/form-data; boundary=---------------------------40013669463662053215375107514',
    },
    method: 'POST',
  })

  if (!responseEntrees.ok) {
    if (responseEntrees.status === 415) {
      const data = await responseEntrees.json() as ApiErrorJava
      throw new Error(`Status: ${responseEntrees.status}, Status text: ${data.detail}`)
    } else {
      const data = await responseEntrees.json() as ApiError
      throw new Error(`Status: ${responseEntrees.status}, Status text: ${data.message}`)
    }
  } else {
    return true
  }
}

async function lancerLeCalculRepository(nomEtablissement: string, nomInventaire: string) {
  const urlCalcul = new URL(`${process.env.EXPOSITION_DONNEES_ENTREES_URL}/entrees/calculs/soumission`)
  urlCalcul.searchParams.append('mode', 'SYNC')

  const responseCalculs = await fetch(urlCalcul, {
    body: JSON.stringify({ nomLot: nomInventaire }),
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
  })

  if (!responseCalculs.ok) {
    if (responseCalculs.status === 415) {
      const data = await responseCalculs.json() as ApiErrorJava
      throw new Error(`Status: ${responseCalculs.status}, Status text: ${data.detail}`)
    } else {
      const data = await responseCalculs.json() as ApiError
      throw new Error(`Status: ${responseCalculs.status}, Status text: ${data.message}`)
    }
  } else {
    await miseAJourInventaireRepository(nomEtablissement, nomInventaire)
  }
}

export async function supprimerEquipementsPhysiquesRepository(nomEtablissement: string, nomInventaire: string) {
  await prisma.en_equipement_physique.deleteMany({ where: { nom_lot: nomInventaire, nom_organisation: nomEtablissement } })
}
