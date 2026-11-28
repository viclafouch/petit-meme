import { cn } from '~/lib/utils'

const FLOATING_SLOTS = [
  {
    className: 'left-0 top-0',
    logos: [
      { name: 'Homer Simpson', src: '/images/homer-simpson.png' },
      { name: 'Cat', src: '/images/cat.png' }
    ],
    cycle: '8s',
    float: '5.2s'
  },
  {
    className: '-left-30 top-1/3 -translate-y-1/3',
    logos: [
      { name: 'Will Smith', src: '/images/will-smith.png' },
      { name: 'Roll Safe', src: '/images/roll-safe.png' }
    ],
    cycle: '12s',
    float: '6.8s'
  },
  {
    className: 'left-0 bottom-0',
    logos: [
      { name: 'Ricardo', src: '/images/ricardo.png' },
      { name: 'Pepe the Frog', src: '/images/pepe-the-frog.png' }
    ],
    cycle: '10.5s',
    float: '4.6s'
  },
  {
    className: 'right-0 top-0',
    logos: [{ name: 'Doge', src: '/images/doge.png' }],
    cycle: '9.5s',
    float: '7.4s'
  },
  {
    className: '-right-30 top-1/3 -translate-y-1/3',
    logos: [
      {
        name: 'Mike Wazowski Sulivan',
        src: '/images/mike-wazowski-sulivan.webp'
      }
    ],
    cycle: '11s',
    float: '5.8s'
  },
  {
    className: 'right-0 bottom-0',
    logos: [{ name: 'Andras Arato', src: '/images/andras-arato.png' }],
    cycle: '13s',
    float: '6.2s'
  }
]

export const FloatingLogos = () => {
  return (
    <div aria-hidden="true" className="contents max-md:hidden">
      {FLOATING_SLOTS.map((slot, index) => {
        return (
          <div
            key={slot.className}
            className={cn('floating-logo-slot absolute', slot.className)}
            style={{
              '--slot-index': index,
              '--logo-cycle': slot.cycle,
              '--logo-float': slot.float
            }}
          >
            <div className="floating-logo-float">
              <div className="relative h-24 w-48">
                {slot.logos.map((logo) => {
                  return (
                    <img
                      key={logo.name}
                      src={logo.src}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="floating-logo absolute inset-0 size-full object-contain"
                      data-cycling={slot.logos.length > 1 || undefined}
                    />
                  )
                })}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
