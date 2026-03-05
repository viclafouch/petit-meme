import React from 'react'
import { ArrowLeft, SlidersHorizontal, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import {
  StudioActions,
  StudioMobileActions
} from '@/components/Meme/Studio/studio-actions'
import { StudioControls } from '@/components/Meme/Studio/studio-controls'
import { StudioPreview } from '@/components/Meme/Studio/studio-preview'
import { StudioRelatedMemes } from '@/components/Meme/Studio/studio-related-memes'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle
} from '@/components/ui/drawer'
import { Input } from '@/components/ui/input'
import { LoadingButton } from '@/components/ui/loading-button'
import { Separator } from '@/components/ui/separator'
import type { MemeWithVideo } from '@/constants/meme'
import { STUDIO_TEXT_MAX_LENGTH } from '@/constants/studio'
import {
  useVideoInitializer,
  useVideoPreloader,
  useVideoProcessor
} from '@/hooks/use-video-processor'
import { m } from '@/paraglide/messages.js'
import { useStudioStore } from '@/stores/studio.store'
import { Link } from '@tanstack/react-router'

type StudioBrandingParams = {
  title: string
}

const StudioBranding = ({ title }: StudioBrandingParams) => {
  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-1.5">
        <img
          src="/images/logo.png"
          alt=""
          width={16}
          height={16}
          decoding="async"
          className="size-4"
          aria-hidden="true"
        />
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Studio
        </span>
      </div>
      <h1 className="font-bricolage text-sm font-semibold truncate">{title}</h1>
    </div>
  )
}

type StudioPageParams = {
  meme: MemeWithVideo
  relatedMemesPromise: Promise<MemeWithVideo[]>
}

export const StudioPage = ({ meme, relatedMemesPromise }: StudioPageParams) => {
  const ffmpegQuery = useVideoInitializer()
  const { triggerPreload } = useVideoPreloader(ffmpegQuery.data, meme.id)

  const settings = useStudioStore((state) => {
    return state.settings
  })
  const setSettings = useStudioStore((state) => {
    return state.setSettings
  })
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false)

  const { progress, processVideo, isProcessing, processedData, cancel } =
    useVideoProcessor(ffmpegQuery.data)

  const hasText = settings.text.trim().length > 0

  const handleGenerate = () => {
    if (!hasText) {
      toast.error(m.studio_enter_text())

      return
    }

    processVideo({ meme, ...settings })
  }

  const handleTextChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSettings({ text: event.target.value })
  }

  return (
    <div className="flex flex-col md:flex-row h-full overflow-hidden">
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center gap-3 px-4 py-2 border-b border-white/5 md:hidden">
          <Link
            to="/memes/$memeId"
            params={{ memeId: meme.id }}
            className={buttonVariants({ variant: 'ghost', size: 'lg' })}
            aria-label={m.studio_back_to_meme()}
          >
            <ArrowLeft className="size-5" />
            <StudioBranding title={meme.title} />
          </Link>
        </div>
        <div className="flex-1 min-h-0 p-3 md:p-8 md:bg-black/40">
          <StudioPreview
            bunnyId={meme.video.bunnyId}
            title={meme.title}
            isProcessing={isProcessing}
            progress={progress}
            processedVideoUrl={processedData?.url ?? null}
            onCancel={cancel}
          />
        </div>
        {processedData !== null ? (
          <StudioMobileActions processedData={processedData} />
        ) : null}
        <div className="flex items-center gap-2 px-3 py-2.5 border-t bg-background md:hidden">
          <Input
            value={settings.text}
            onChange={handleTextChange}
            onFocus={triggerPreload}
            placeholder={m.studio_add_text_placeholder()}
            autoComplete="off"
            type="text"
            maxLength={STUDIO_TEXT_MAX_LENGTH}
            className="flex-1 h-8"
            aria-label={m.studio_text_aria()}
          />
          <Button
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={() => {
              setIsDrawerOpen(true)
            }}
            aria-label={m.studio_open_settings()}
          >
            <SlidersHorizontal className="size-4" />
            {m.studio_settings()}
          </Button>
          <LoadingButton
            isLoading={isProcessing}
            onClick={handleGenerate}
            size="sm"
          >
            <Sparkles />
            {m.studio_generate()}
          </LoadingButton>
        </div>
        <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
          <DrawerContent className="max-h-[80dvh]" aria-describedby={undefined}>
            <DrawerHeader>
              <DrawerTitle>{m.studio_settings()}</DrawerTitle>
            </DrawerHeader>
            <div className="flex flex-col gap-4 overflow-y-auto px-4 pb-6">
              <StudioControls
                settings={settings}
                onSettingsChange={setSettings}
                disabled={isProcessing}
                hideTextInput
                bunnyId={meme.video.bunnyId}
              />
              <Separator />
              <React.Suspense fallback={null}>
                <StudioRelatedMemes
                  currentMemeId={meme.id}
                  relatedMemesPromise={relatedMemesPromise}
                />
              </React.Suspense>
            </div>
          </DrawerContent>
        </Drawer>
      </div>
      <div className="hidden md:flex w-80 lg:w-96 overflow-y-auto flex-col bg-background border-l">
        <div className="flex items-center gap-3 px-4 py-3 sm:px-6 border-b">
          <Link
            to="/memes/$memeId"
            params={{ memeId: meme.id }}
            className={buttonVariants({ variant: 'ghost', size: 'icon' })}
            aria-label={m.studio_back_to_meme()}
          >
            <ArrowLeft className="size-4" />
          </Link>
          <StudioBranding title={meme.title} />
        </div>
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-4">
          <StudioControls
            settings={settings}
            onSettingsChange={setSettings}
            disabled={isProcessing}
            onTextInputFocus={triggerPreload}
            bunnyId={meme.video.bunnyId}
          />
          <Separator />
          <StudioActions
            isProcessing={isProcessing}
            processedData={processedData}
            onGenerate={handleGenerate}
          />
          <Separator />
          <React.Suspense fallback={null}>
            <StudioRelatedMemes
              currentMemeId={meme.id}
              relatedMemesPromise={relatedMemesPromise}
            />
          </React.Suspense>
        </div>
      </div>
    </div>
  )
}
