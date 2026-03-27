import { m } from '~/paraglide/messages.js'
import { getGuaranteeItems } from './constants'

export const GuaranteeBanner = () => {
  return (
    <section
      aria-label={m.pricing_guarantees_label()}
      className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm text-muted-foreground"
    >
      {getGuaranteeItems().map((item) => {
        return (
          <div key={item.label} className="flex items-center gap-2">
            <item.icon size={16} aria-hidden className="shrink-0" />
            <span>{item.label}</span>
          </div>
        )
      })}
    </section>
  )
}
