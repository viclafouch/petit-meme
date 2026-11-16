import {
  BREAK_UI_DATASETS,
  IS_BREAK_UI_ENABLED,
  useBreakUiDataset
} from '~/routes/_public__root/memes/-lib/break-ui-fixtures'

const LABELS = {
  demo: 'Demo data',
  worst: 'Worst case',
  empty: 'Empty',
  one: 'One'
} as const

export const BreakUiToggle = () => {
  const dataset = useBreakUiDataset()

  if (!IS_BREAK_UI_ENABLED) {
    return null
  }

  return (
    <div
      data-break-ui-toggle
      className="fixed inset-x-0 bottom-[calc(var(--tab-bar-space)+0.5rem)] z-50 flex justify-center pointer-events-none"
    >
      <div className="pointer-events-auto flex gap-0.5 rounded-full bg-neutral-300 p-0.5 font-sans text-xs text-neutral-900">
        {BREAK_UI_DATASETS.map((key) => {
          return (
            <a
              key={key}
              href={`?data=${key}`}
              className={
                key === dataset
                  ? 'rounded-full bg-white px-2.5 py-1 font-semibold'
                  : 'rounded-full px-2.5 py-1'
              }
            >
              {LABELS[key]}
            </a>
          )
        })}
      </div>
    </div>
  )
}
