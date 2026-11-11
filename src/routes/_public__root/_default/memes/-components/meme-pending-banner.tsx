import { EyeOff, Pencil } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { buttonVariants } from '~/components/ui/button'
import type { MemeFullData } from '~/constants/meme'
import { m } from '~/paraglide/messages'

type MemePendingBannerProps = {
  memeId: MemeFullData['id']
}

export const MemePendingBanner = ({ memeId }: MemePendingBannerProps) => {
  return (
    <section
      aria-labelledby="meme-pending-banner-title"
      className="relative isolate w-full overflow-hidden rounded-lg bg-info text-info-foreground"
    >
      <div aria-hidden className="absolute inset-0 -z-10 bg-hatch" />
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4 md:px-5">
        <EyeOff className="size-6 shrink-0" aria-hidden />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h2
            id="meme-pending-banner-title"
            className="font-bricolage text-lg leading-tight font-semibold"
          >
            {m.meme_pending_banner_title()}
          </h2>
          <p className="text-sm text-pretty text-info-foreground/85">
            {m.meme_pending_banner_description()}
          </p>
        </div>
        <Link
          to="/admin/library/$memeId"
          params={{ memeId }}
          className={buttonVariants({ variant: 'secondary', size: 'sm' })}
        >
          <Pencil aria-hidden />
          {m.meme_pending_banner_edit()}
        </Link>
      </div>
    </section>
  )
}
