import { m } from '~/paraglide/messages'
import type { Locale } from '~/paraglide/runtime'
import andrasArato from './assets/andras-arato.png?inline'
import cat from './assets/cat.png?inline'
import doge from './assets/doge.png?inline'
import homerSimpson from './assets/homer-simpson.png?inline'
import ogLogo from './assets/og-logo.png?inline'
import pepeTheFrog from './assets/pepe-the-frog.png?inline'
import rollSafe from './assets/roll-safe.png?inline'
import { OgBackdrop } from './og-backdrop'

type OgHomeTemplateProps = {
  locale: Locale
  hostname: string
}

const BRAND_GRADIENT = 'linear-gradient(110deg, #34d399, #22d3ee 45%, #a78bfa)'
const PREMIUM_GRADIENT =
  'linear-gradient(135deg, #fce396, #f5b33b 45%, #e78b30)'
const BADGE_GRADIENT =
  'linear-gradient(90deg, #34d399, #22d3ee, #a78bfa, #f472b6)'
const HERO_GLOW = [
  'radial-gradient(ellipse 420px 260px at 82% 24%, rgba(251, 200, 80, 0.28), transparent)',
  'radial-gradient(ellipse 380px 280px at 16% 60%, rgba(122, 178, 200, 0.24), transparent)',
  'radial-gradient(ellipse 420px 200px at 56% 92%, rgba(214, 41, 118, 0.22), transparent)'
].join(', ')
const CROWN_PATH =
  'M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z'

const buildTitleLines = (locale: Locale) => {
  const options = { locale }

  return [
    [
      { text: m.home_hero_h1_1({}, options), isHighlight: true },
      { text: m.home_hero_h1_2({}, options).trimEnd(), isHighlight: false }
    ],
    [
      { text: m.home_hero_h1_3({}, options), isHighlight: true },
      { text: m.home_hero_h1_4({}, options), isHighlight: false },
      { text: m.home_hero_h1_5({}, options), isHighlight: true }
    ]
  ]
}

type FloatingMeme = {
  image: string
  top: number
  left: number
  rotate: number
  size: number
}

const FLOATING_MEMES = [
  { image: cat, top: 55, left: 60, rotate: -8, size: 100 },
  { image: rollSafe, top: 240, left: 35, rotate: 5, size: 105 },
  {
    image: pepeTheFrog,
    top: 410,
    left: 75,
    rotate: -10,
    size: 110
  },
  { image: doge, top: 45, left: 1050, rotate: 10, size: 100 },
  {
    image: homerSimpson,
    top: 230,
    left: 1040,
    rotate: -6,
    size: 110
  },
  {
    image: andrasArato,
    top: 400,
    left: 1030,
    rotate: 7,
    size: 105
  }
] as const satisfies readonly FloatingMeme[]

const HIGHLIGHT_COLOR = '#ffffff'
const MUTED_COLOR = '#a1a1aa'

export const OgHomeTemplate = ({ locale, hostname }: OgHomeTemplateProps) => {
  const options = { locale }
  const lines = buildTitleLines(locale)

  return (
    <div
      tw="flex flex-col w-full h-full relative"
      style={{ backgroundColor: '#0a0a0a', fontFamily: 'Bricolage Grotesque' }}
    >
      <div
        tw="absolute top-0 left-0 right-0 bottom-0 flex"
        style={{ backgroundImage: HERO_GLOW }}
      />
      <OgBackdrop />
      {FLOATING_MEMES.map((meme) => {
        return (
          <img
            key={meme.image}
            src={meme.image}
            alt=""
            width={meme.size}
            height={meme.size}
            tw="absolute"
            style={{
              top: `${meme.top}px`,
              left: `${meme.left}px`,
              transform: `rotate(${meme.rotate}deg)`,
              objectFit: 'contain'
            }}
          />
        )
      })}
      <div tw="flex flex-col items-center justify-center flex-1">
        <div tw="flex flex-col items-center" style={{ width: '780px' }}>
          <img
            src={ogLogo}
            alt=""
            height={40}
            style={{ objectFit: 'contain' }}
          />
          <div
            tw="flex mt-6"
            style={{
              padding: '2px',
              borderRadius: '9999px',
              backgroundImage: BADGE_GRADIENT
            }}
          >
            <div
              tw="flex items-center"
              style={{
                padding: '8px 22px',
                borderRadius: '9999px',
                backgroundColor: '#141414',
                fontSize: '20px'
              }}
            >
              <span style={{ color: '#5eead4' }}>
                {m.home_hero_new_memes_badge_og({}, options)}
              </span>
            </div>
          </div>
          <div tw="flex flex-col items-center mt-5" style={{ gap: '4px' }}>
            {lines.map((line) => {
              const lineKey = line
                .map((segment) => {
                  return segment.text
                })
                .join('')

              return (
                <div
                  key={lineKey}
                  tw="flex items-baseline justify-center"
                  style={{
                    fontSize: '54px',
                    lineHeight: 1.12,
                    letterSpacing: '-0.02em',
                    fontWeight: 'bold'
                  }}
                >
                  {line.map((segment) => {
                    return (
                      <span
                        key={segment.text}
                        style={{
                          color: segment.isHighlight
                            ? HIGHLIGHT_COLOR
                            : MUTED_COLOR,
                          whiteSpace: 'pre'
                        }}
                      >
                        {segment.text}
                      </span>
                    )
                  })}
                </div>
              )
            })}
          </div>
          <div
            tw="mt-5"
            style={{
              display: 'block',
              width: '100%',
              fontSize: '22px',
              lineHeight: 1.5,
              color: MUTED_COLOR,
              textAlign: 'center',
              textWrap: 'balance'
            }}
          >
            {m.home_hero_description({}, options)}
          </div>
        </div>
        <div tw="flex items-center justify-center mt-7" style={{ gap: '16px' }}>
          <div
            tw="flex items-center"
            style={{
              padding: '14px 32px',
              borderRadius: '9999px',
              backgroundImage: BRAND_GRADIENT,
              color: '#121212',
              fontSize: '22px',
              boxShadow: '0 12px 40px -12px #22d3ee'
            }}
          >
            {`${m.home_hero_cta_discover({}, options)} ${m.home_hero_cta_free({}, options)}`}
          </div>
          <div
            tw="flex items-center"
            style={{
              gap: '10px',
              padding: '14px 32px',
              borderRadius: '9999px',
              backgroundImage: PREMIUM_GRADIENT,
              color: '#3b1e02',
              fontSize: '22px',
              boxShadow: '0 12px 40px -12px #f5b33b'
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="#3b1e02"
              stroke="#3b1e02"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d={CROWN_PATH} />
              <path d="M5 21h14" />
            </svg>
            {m.home_hero_cta_premium({}, options)}
          </div>
        </div>
      </div>
      <div tw="flex justify-center pb-4">
        <span tw="text-xl" style={{ color: '#737373' }}>
          {hostname}
        </span>
      </div>
    </div>
  )
}
