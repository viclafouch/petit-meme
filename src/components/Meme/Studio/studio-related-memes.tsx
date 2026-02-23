import React from 'react'
import { Label } from '@/components/ui/label'
import type { MemeWithVideo } from '@/constants/meme'
import { buildVideoImageUrl } from '@/lib/bunny'
import { Link } from '@tanstack/react-router'

type StudioRelatedMemesParams = {
  currentMemeId: string
  relatedMemesPromise: Promise<MemeWithVideo[]>
}

export const StudioRelatedMemes = ({
  currentMemeId,
  relatedMemesPromise
}: StudioRelatedMemesParams) => {
  const relatedMemes = React.use(relatedMemesPromise)

  const filteredMemes = relatedMemes.filter((meme) => {
    return meme.id !== currentMemeId
  })

  if (filteredMemes.length === 0) {
    return null
  }

  return (
    <div className="flex flex-col gap-2.5">
      <Label>Essayer avec</Label>
      <div className="grid grid-cols-2 gap-2">
        {filteredMemes.map((meme) => {
          return (
            <Link
              key={meme.id}
              to="/memes/$memeId/studio"
              params={{ memeId: meme.id }}
              className="group relative aspect-video overflow-hidden rounded-md border border-border hover:border-primary transition-colors"
            >
              <img
                src={buildVideoImageUrl(meme.video.bunnyId)}
                alt={meme.title}
                className="size-full object-cover"
                loading="lazy"
                decoding="async"
              />
              <div className="absolute inset-x-0 bottom-0 bg-black/70 px-1.5 py-1">
                <span className="text-[11px] text-white leading-tight line-clamp-1">
                  {meme.title}
                </span>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
