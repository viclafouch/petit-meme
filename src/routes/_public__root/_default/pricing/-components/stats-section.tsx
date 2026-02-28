import { STAT_ITEMS } from './constants'

export const StatsSection = () => {
  return (
    <section
      aria-label="Statistiques de la plateforme"
      className="flex flex-col items-center justify-center gap-8 sm:flex-row sm:gap-0 sm:divide-x sm:divide-border"
    >
      {STAT_ITEMS.map((stat) => {
        return (
          <div key={stat.label} className="flex flex-col items-center sm:px-12">
            <p className="font-bricolage text-3xl font-bold text-foreground">
              {stat.value}
            </p>
            <p className="text-sm text-muted-foreground">{stat.label}</p>
          </div>
        )
      })}
    </section>
  )
}
