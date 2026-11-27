import { AppIcon } from '~/components/install/app-icon'
import { buildAppQrCodePath } from '~/helpers/web-app-assets'
import { cn } from '~/lib/utils'
import { m } from '~/paraglide/messages'
import { getLocale } from '~/paraglide/runtime'
import { ComputerInstallAction } from './install-action'

type AppQrCodeProps = {
  className?: string
}

type AppQrCodeImageProps = {
  alt?: string
  className?: string
}

export const AppQrCodeImage = ({
  alt = m.app_page_qr_alt(),
  className
}: AppQrCodeImageProps) => {
  return (
    <div
      className={cn(
        'shrink-0 rounded-3xl bg-white p-4 shadow-[0_1.5rem_3rem_-1.5rem_rgb(0_0_0/0.6)] ring-1 ring-black/5',
        className
      )}
    >
      <div className="relative size-36">
        <img
          src={buildAppQrCodePath(getLocale())}
          alt={alt}
          width={144}
          height={144}
          loading="lazy"
          decoding="async"
          className="size-full"
        />
        <AppIcon
          size={64}
          className="absolute top-1/2 left-1/2 size-[19%] -translate-1/2 ring-0"
        />
      </div>
    </div>
  )
}

export const AppQrCode = ({ className }: AppQrCodeProps) => {
  return (
    <div className={cn('flex items-center gap-6', className)}>
      <AppQrCodeImage />
      <div className="flex max-w-xs flex-col gap-2">
        <p className="font-bricolage text-xl leading-heading font-semibold text-balance">
          {m.app_page_qr_title()}
        </p>
        <p className="text-sm text-muted-foreground text-pretty">
          {m.app_page_qr_description()}
        </p>
        <ComputerInstallAction />
      </div>
    </div>
  )
}
