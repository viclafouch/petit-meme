import React from 'react'
import { ExternalLink } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { Button } from '~/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '~/components/ui/dialog'
import { LoadingButton } from '~/components/ui/loading-button'
import { MEME_DERIVED_FORMATS } from '~/constants/bunny'
import type { MemeFullData } from '~/constants/meme'
import { MemeStatus } from '~/db/generated/prisma/enums'
import { FileBadge } from './meme-publish-card'
import { MemePublishTimeline } from './meme-publish-timeline'
import type { MemePublisher } from './use-meme-publisher'

type ViewMemeOnSiteButtonProps = {
  meme: MemeFullData
  publisher: MemePublisher
}

const ViewOnSiteLabel = () => {
  return (
    <>
      <ExternalLink data-icon="inline-start" aria-hidden />
      Voir sur le site
    </>
  )
}

type SiteLinkButtonProps = {
  memeId: MemeFullData['id']
} & Omit<React.ComponentProps<typeof Button>, 'render' | 'nativeButton'>

const SiteLinkButton = ({
  memeId,
  ...restButtonProps
}: SiteLinkButtonProps) => {
  return (
    <Button
      {...restButtonProps}
      nativeButton={false}
      render={<Link to="/memes/$memeId" params={{ memeId }} />}
    >
      <ViewOnSiteLabel />
    </Button>
  )
}

export const ViewMemeOnSiteButton = ({
  meme,
  publisher
}: ViewMemeOnSiteButtonProps) => {
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const { run, isRunning, missingFiles, regenerate } = publisher
  const hasAllFiles = missingFiles?.length === 0

  const handleGenerate = () => {
    void regenerate()
  }

  if (meme.status === MemeStatus.PUBLISHED) {
    return <SiteLinkButton memeId={meme.id} variant="outline" size="sm" />
  }

  if (meme.status !== MemeStatus.PENDING) {
    return (
      <Button type="button" variant="outline" size="sm" disabled>
        <ViewOnSiteLabel />
      </Button>
    )
  }

  return (
    <>
      {hasAllFiles ? (
        <SiteLinkButton memeId={meme.id} variant="outline" size="sm" />
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setIsDialogOpen(true)
          }}
        >
          <ViewOnSiteLabel />
        </Button>
      )}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Génère le MP4 et le MP3</DialogTitle>
            <DialogDescription>
              L’aperçu sur le site sert à télécharger et partager le Meme avant
              sa publication. Il lui faut le MP4 watermarké et le MP3.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-2">
            {MEME_DERIVED_FORMATS.map((format) => {
              return (
                <FileBadge
                  key={format}
                  format={format}
                  missingFiles={missingFiles}
                />
              )
            })}
          </div>
          {run?.kind === 'regenerate' ? (
            <MemePublishTimeline
              key={run.id}
              run={run}
              meme={meme}
              onRetry={handleGenerate}
            />
          ) : null}
          <DialogFooter>
            {hasAllFiles ? (
              <SiteLinkButton memeId={meme.id} />
            ) : (
              <LoadingButton
                type="button"
                isLoading={isRunning}
                loadingText="Génération..."
                disabled={!missingFiles}
                onClick={handleGenerate}
              >
                Générer les fichiers
              </LoadingButton>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
