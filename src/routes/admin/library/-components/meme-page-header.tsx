import { ExternalLink, Trash } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { type MemeFullData, MemeStatusMeta } from '~/constants/meme'
import { formatDate } from '~/helpers/date'
import { m } from '~/paraglide/messages'
import { getLocale } from '~/paraglide/runtime'
import { DeleteMemeButton } from '~/routes/admin/-components/delete-meme-button'

type MemePageHeaderProps = {
  meme: MemeFullData
}

export const MemePageHeader = ({ meme }: MemePageHeaderProps) => {
  const statusMeta = MemeStatusMeta[meme.status]

  return (
    <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <Badge variant={statusMeta.badgeVariant} size="md">
            {statusMeta.label}
          </Badge>
          <span className="tabular-nums">
            {m.meme_views({ count: meme.viewCount })}
            {' · '}
            {m.meme_bookmarks({ count: meme._count.bookmarkedBy })}
          </span>
          <span>Ajouté le {formatDate(meme.createdAt, getLocale())}</span>
        </div>
        <h1 className="font-bricolage text-2xl font-bold tracking-tight text-balance md:text-3xl">
          {meme.title === '' ? 'Sans titre' : meme.title}
        </h1>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<Link to="/memes/$memeId" params={{ memeId: meme.id }} />}
        >
          <ExternalLink data-icon="inline-start" aria-hidden />
          Voir sur le site
        </Button>
        <DeleteMemeButton size="sm" variant="destructive" meme={meme}>
          <Trash data-icon="inline-start" aria-hidden />
          Supprimer
        </DeleteMemeButton>
      </div>
    </header>
  )
}
