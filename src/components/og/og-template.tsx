/* oxlint-disable react/no-unknown-property -- `tw` is Takumi's built-in Tailwind prop */

import { STAR_SHADOWS } from './og-stars'

type OgTemplateParams = {
  title: string
  subtitle?: string
  hostname: string
  logoUrl: string
  heroImageUrl: string
}

export const OgTemplate = ({
  title,
  subtitle,
  hostname,
  logoUrl,
  heroImageUrl
}: OgTemplateParams) => {
  return (
    <div
      tw="flex flex-col w-full h-full p-[60px] relative"
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
      <div tw="flex items-center">
        <img
          src={logoUrl}
          alt=""
          height={50}
          style={{ objectFit: 'contain' }}
        />
      </div>
      <div tw="flex flex-1 items-center">
        <div tw="flex flex-col flex-1 justify-center gap-4">
          <div
            tw="flex text-white font-bold"
            style={{
              fontSize: '64px',
              lineHeight: 1.1,
              letterSpacing: '-0.02em'
            }}
          >
            {title}
          </div>
          {subtitle ? (
            <div
              tw="flex text-neutral-400"
              style={{
                fontSize: '28px',
                lineHeight: 1.4,
                lineClamp: 3,
                textOverflow: 'ellipsis'
              }}
            >
              {subtitle}
            </div>
          ) : null}
        </div>
        <img
          src={heroImageUrl}
          alt=""
          width={300}
          height={300}
          tw="ml-8"
          style={{ objectFit: 'contain' }}
        />
      </div>
      <div tw="flex justify-end">
        <span tw="text-xl text-neutral-500">{hostname}</span>
      </div>
    </div>
  )
}
