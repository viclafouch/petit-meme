/* oxlint-disable react/no-unknown-property -- `tw` is Takumi's built-in Tailwind prop */

import type { Locale } from '~/paraglide/runtime'
import { STAR_SHADOWS } from './og-stars'

type OgHomeTemplateParams = {
  locale: Locale
  siteUrl: string
  hostname: string
  logoUrl: string
}

type TitleSegment = {
  text: string
  isHighlight: boolean
}

const TITLE_LINES = {
  fr: [
    [
      { text: 'Ta', isHighlight: true },
      { text: ' banque de mèmes vidéo,', isHighlight: false }
    ],
    [
      { text: 'prête à faire', isHighlight: true },
      { text: ' rire ', isHighlight: false },
      { text: 'Internet', isHighlight: true }
    ]
  ],
  en: [
    [
      { text: 'Your', isHighlight: true },
      { text: ' video meme library,', isHighlight: false }
    ],
    [
      { text: 'ready to make', isHighlight: true },
      { text: ' the ', isHighlight: false },
      { text: 'Internet', isHighlight: true }
    ]
  ]
} as const satisfies Record<Locale, readonly (readonly TitleSegment[])[]>

const HOME_CONTENT = {
  fr: {
    description:
      'Explorez la plus grande collection de mèmes vidéo et partagez-les en 1 clic. Ajoutez du texte pour les rendre uniques.',
    buttonText: 'Découvrir'
  },
  en: {
    description:
      'Explore the largest collection of video memes and share them in 1 click. Add text to make them unique.',
    buttonText: 'Discover'
  }
} as const satisfies Record<Locale, { description: string; buttonText: string }>

type FloatingMeme = {
  path: string
  top: number
  left: number
  rotate: number
  size: number
}

const FLOATING_MEMES = [
  { path: '/images/cat.png', top: 55, left: 60, rotate: -8, size: 100 },
  { path: '/images/roll-safe.png', top: 240, left: 35, rotate: 5, size: 105 },
  {
    path: '/images/pepe-the-frog.png',
    top: 410,
    left: 75,
    rotate: -10,
    size: 110
  },
  { path: '/images/doge.png', top: 45, left: 1050, rotate: 10, size: 100 },
  {
    path: '/images/homer-simpson.png',
    top: 230,
    left: 1040,
    rotate: -6,
    size: 110
  },
  {
    path: '/images/andras-arato.png',
    top: 400,
    left: 1030,
    rotate: 7,
    size: 105
  }
] as const satisfies readonly FloatingMeme[]

const HIGHLIGHT_COLOR = '#ffffff'
const MUTED_COLOR = '#a1a1aa'

export const OgHomeTemplate = ({
  locale,
  siteUrl,
  hostname,
  logoUrl
}: OgHomeTemplateParams) => {
  const lines = TITLE_LINES[locale]
  const content = HOME_CONTENT[locale]

  return (
    <div
      tw="flex flex-col w-full h-full relative"
      style={{ backgroundColor: '#0a0a0a', fontFamily: 'Bricolage Grotesque' }}
    >
      <div
        tw="absolute top-0 left-0"
        style={{
          width: '1px',
          height: '1px',
          backgroundColor: 'transparent',
          borderRadius: '50%',
          boxShadow: STAR_SHADOWS
        }}
      />
      <div
        tw="flex absolute bottom-0 left-0 right-0 h-[4px]"
        style={{
          background: 'linear-gradient(90deg, #6366f1, #a855f7, #ec4899)'
        }}
      />
      {FLOATING_MEMES.map((meme) => {
        return (
          <img
            key={meme.path}
            src={`${siteUrl}${meme.path}`}
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
        <div tw="flex flex-col items-center" style={{ width: '760px' }}>
          <img
            src={logoUrl}
            alt=""
            height={44}
            style={{ objectFit: 'contain' }}
          />
          <div tw="flex flex-col items-center mt-6" style={{ gap: '4px' }}>
            {lines.map((line, lineIndex) => {
              return (
                <div
                  key={lineIndex}
                  tw="flex items-baseline justify-center"
                  style={{
                    fontSize: '52px',
                    lineHeight: 1.15,
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
              textAlign: 'center'
            }}
          >
            {content.description}
          </div>
        </div>
        <div
          tw="flex items-center justify-center mt-6"
          style={{
            border: '1.5px solid rgba(255,255,255,0.25)',
            borderRadius: '9999px',
            padding: '10px 32px',
            backgroundColor: 'rgba(255,255,255,0.05)'
          }}
        >
          <span style={{ color: '#ffffff', fontSize: '20px' }}>
            {content.buttonText}
          </span>
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
