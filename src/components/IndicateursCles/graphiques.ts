import { Chart, CategoryScale, LinearScale, BarElement, Tooltip, Legend, ArcElement, ChartData, ChartOptions } from 'chart.js'

import { EtapesAcv, IndicateursSommesViewModel, toLowerCase } from '../viewModel'

Chart.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend
)

const colors = [
  'rgba(22, 91, 170, 1)',
  'rgba(161, 85, 185, 1)',
  'rgba(247, 101, 163, 1)',
  'rgba(255, 174, 209, 1)',
  'rgba(139, 86, 18, 1)',
  'rgba(242, 154, 43, 1)',
  'rgba(255, 233, 206, 1)',
  'rgba(24, 71, 55, 1)',
  'rgba(54, 142, 110, 1)',
  'rgba(163, 230, 206, 1)',
  'rgba(111, 0, 0, 1)',
  'rgba(225, 20, 20, 1)',
  'rgba(255, 166, 166, 1)',
  'rgba(180, 163, 0, 1)',
  'rgba(218, 200, 255, 1)',
  'rgba(255, 245, 140, 1)',
  'rgba(117, 31, 81, 1)',
]

export const optionsHistogramme: ChartOptions<'bar'> = {
  plugins: {
    legend: {
      position: 'bottom' as const,
    },
  },
  responsive: true,
  scales: {
    x: {
      stacked: true,
    },
    y: {
      stacked: true,
      title: {
        display: true,
        text: 'kgCO2 eq',
      },
    },
  },
}

export const optionsCamembert: ChartOptions<'pie'> = {
  aspectRatio: 3,
  plugins: {
    legend: {
      position: 'right' as const,
    },
  },
  responsive: true,
}

const filtrerParEtapeAcv = (etapeAcv: EtapesAcv): (indicateur: IndicateursSommesViewModel) => boolean =>
  (indicateur: IndicateursSommesViewModel): boolean => indicateur.etapeAcv === etapeAcv

const filtrerParTypeEquipement = (typeEquipement: string): (indicateur: IndicateursSommesViewModel) => boolean =>
  (indicateur: IndicateursSommesViewModel): boolean => indicateur.typeEquipement === typeEquipement

const cumulerParImpact = (impactAccumule: number[], indicateur: IndicateursSommesViewModel): number[] => {
  impactAccumule.push(indicateur.impact)
  return impactAccumule
}

export function donneesParTypeEquipement(indicateursSommesViewModel: IndicateursSommesViewModel[]): ChartData<'bar'> {
  const nomTypesEquipement = indicateursSommesViewModel.reduce(
    (quantiteAccumulee, indicateur): Set<string> => quantiteAccumulee.add(indicateur.typeEquipement), new Set<string>()
  )

  const impactsParCycleDeVie = Object.values(EtapesAcv).map((etapeAcv, index) => {
    return {
      backgroundColor: colors[index],
      data: indicateursSommesViewModel
        .filter(filtrerParEtapeAcv(etapeAcv))
        .reduce(cumulerParImpact, Array<number>()),
      label: toLowerCase(etapeAcv),
    }
  })

  return {
    datasets: impactsParCycleDeVie,
    labels: Array.from(nomTypesEquipement),
  }
}

export function donneesParCycleDeVie(indicateursSommesViewModel: IndicateursSommesViewModel[], referentielsEquipementsViewModel: string[]): ChartData<'bar'> {
  const etapesAcv = indicateursSommesViewModel.reduce(
    (quantiteAccumulee, indicateur): Set<string> => quantiteAccumulee.add(toLowerCase(indicateur.etapeAcv)), new Set<string>()
  )

  const impactsParTypeEquipement = referentielsEquipementsViewModel
    .map((typeEquipement, index) => {
      return {
        backgroundColor: colors[index],
        data: indicateursSommesViewModel
          .filter(filtrerParTypeEquipement(typeEquipement))
          .reduce(cumulerParImpact, Array<number>()),
        label: typeEquipement,
      }
    })
    .filter((data): boolean => data.data.length !== 0)

  return {
    datasets: impactsParTypeEquipement,
    labels: Array.from(etapesAcv),
  }
}

export function donneesRepartitionParTypeEquipement(
  indicateursSommesViewModel: IndicateursSommesViewModel[],
  referentielsEquipementsViewModel: string[],
  etapeAcv: EtapesAcv
): ChartData<'pie'> {
  const nomTypesEquipement = indicateursSommesViewModel.reduce(
    (quantiteAccumulee, indicateur): Set<string> => quantiteAccumulee.add(indicateur.typeEquipement), new Set<string>()
  )

  const impactsParTypeEquipement = referentielsEquipementsViewModel
    .map((typeEquipement): number[] => {
      return indicateursSommesViewModel
        .filter(filtrerParTypeEquipement(typeEquipement))
        .filter(filtrerParEtapeAcv(etapeAcv))
        .reduce(cumulerParImpact, Array<number>())
    })
    .filter((data): boolean => data.length !== 0)

  return {
    datasets: [
      {
        backgroundColor: colors,
        data: impactsParTypeEquipement.flat(),
        label: toLowerCase(etapeAcv),
      },
    ],
    labels: Array.from(nomTypesEquipement),
  }
}
