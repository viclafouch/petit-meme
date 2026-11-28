import { cn } from '~/lib/utils'

const FLOATING_SLOTS = [
  {
    className: 'left-0 top-0',
    logos: [
      { name: 'Homer Simpson', src: '/images/homer-simpson.png' },
      { name: 'Cat', src: '/images/cat.png' }
    ]
  },
  {
    className: '-left-30 top-1/3 -translate-y-1/3',
    logos: [
      { name: 'Will Smith', src: '/images/will-smith.png' },
      { name: 'Roll Safe', src: '/images/roll-safe.png' }
    ]
  },
  {
    className: 'left-0 bottom-0',
    logos: [
      { name: 'Ricardo', src: '/images/ricardo.png' },
      { name: 'Pepe the Frog', src: '/images/pepe-the-frog.png' }
    ]
  },
  {
    className: 'right-0 top-0',
    logos: [{ name: 'Doge', src: '/images/doge.png' }]
  },
  {
    className: '-right-30 top-1/3 -translate-y-1/3',
    logos: [
      {
        name: 'Mike Wazowski Sulivan',
        src: '/images/mike-wazowski-sulivan.webp'
      }
    ]
  },
  {
    className: 'right-0 bottom-0',
    logos: [{ name: 'Andras Arato', src: '/images/andras-arato.png' }]
  }
]

export const FloatingLogos = () => {
  return (
    <div aria-hidden="true" className="contents max-md:hidden">
      {FLOATING_SLOTS.map((slot) => {
        return (
          <div
            key={slot.className}
            className={cn('floating-logo-slot absolute', slot.className)}
          >
            <div
              className="relative h-24 w-48"
              data-cycling={slot.logos.length > 1 || undefined}
            >
              {slot.logos.map((logo) => {
                return (
                  <img
                    key={logo.name}
                    src={logo.src}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="floating-logo absolute inset-0 size-full object-contain"
                  />
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
