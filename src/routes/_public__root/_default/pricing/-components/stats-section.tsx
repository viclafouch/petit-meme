import { m } from '~/paraglide/messages.js'
import { getStatItems } from './constants'

export const StatsSection = () => {
  return (
    <section
      aria-label={m.pricing_stat_platform()}
      className="flex flex-col items-center justify-center gap-8 sm:flex-row sm:gap-0 sm:divide-x sm:divide-border"
    >
      {getStatItems().map((stat) => {
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
