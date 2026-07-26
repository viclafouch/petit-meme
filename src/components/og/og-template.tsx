import { OgBackdrop } from './og-backdrop'

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
      <OgBackdrop />
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
              letterSpacing: '-0.02em',
              lineClamp: 2,
              textOverflow: 'ellipsis'
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
