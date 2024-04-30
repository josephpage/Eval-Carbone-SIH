import { useReducer, useState } from 'react'

import { modelesSelectionnes } from './modele'

export type ModeleReducer = Readonly<{
  id: string
  dureeDeVie: number
  heureUtilisation: number
  nomModele: string
  quantite: number
}>

type UseEquipement = Readonly<{
  isToggle: boolean
  lignesModele: ReadonlyArray<ModeleReducer>
  modifierUnModele: (modele: ModeleReducer) => void
  toggle: () => void
}>

export function useEquipement(setQuantiteGlobale: (quantite: number) => void, modeles: Array<ModeleReducer>): UseEquipement {
  const [lignesModele, dispatch] = useReducer(modelesReducer, modeles)
  const [isToggle, setIsToggle] = useState<boolean>(false)

  const toggle = () => {
    setIsToggle(!isToggle)
  }

  const modifierUnModele = (modele: ModeleReducer) => {
    dispatch({
      id: modele.id,
      modele,
      type: 'changed',
    })

    const quantiteGlobale = modelesSelectionnes().reduce((quantiteAccumulee, modele): number => quantiteAccumulee + modele.quantite, 0)
    setQuantiteGlobale(quantiteGlobale)
  }

  return {
    isToggle,
    lignesModele,
    modifierUnModele,
    toggle,
  }
}

type ActionReducer = Readonly<{
  id: string
  modele: ModeleReducer
  type: string
}>

function modelesReducer(modeles: ReadonlyArray<ModeleReducer>, action: ActionReducer): Array<ModeleReducer> {
  switch (action.type) {
    case 'changed': {
      return modeles.map((modele: ModeleReducer): ModeleReducer => {
        if (modele.id === action.id) {
          return action.modele
        } else {
          return modele
        }
      })
    }
    default: {
      throw Error('Unknown action: ' + action.type)
    }
  }
}
