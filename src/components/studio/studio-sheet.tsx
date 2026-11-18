import React from 'react'
import { X } from 'lucide-react'
import { useHydrated } from '@tanstack/react-router'
import { StudioEditor } from '~/components/studio/studio-editor'
import { useSheetDialog } from '~/components/studio/use-sheet-dialog'
import { useSheetDrag } from '~/components/studio/use-sheet-drag'
import { useSheetKeyboard } from '~/components/studio/use-sheet-keyboard'
import { useStudio, type StudioMeme } from '~/components/studio/use-studio'
import { useStudioHistory } from '~/components/studio/use-studio-history'
import { LOGO_PATH, SITE_NAME } from '~/constants/branding'
import { m } from '~/paraglide/messages'

const blurFocusedField = () => {
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur()
  }
}

type StudioHeaderProps = {
  meme: StudioMeme
  titleId: string
  onClose: () => void
}

const StudioHeader = ({ meme, titleId, onClose }: StudioHeaderProps) => {
  return (
    <div className="studio-sheet-header">
      <img
        src={LOGO_PATH}
        alt=""
        width={28}
        height={28}
        decoding="async"
        className="size-7 shrink-0"
      />
      <div className="min-w-0 flex-1 leading-tight">
        <h2 id={titleId} className="font-bricolage text-[0.9375rem] font-bold">
          {m.meme_studio()}{' '}
          <span className="font-semibold text-white/50">· {SITE_NAME}</span>
        </h2>
        <p className="truncate text-xs text-white/60">{meme.title}</p>
      </div>
      <button
        type="button"
        className="studio-done"
        onPointerDown={(event) => {
          event.preventDefault()
        }}
        onClick={blurFocusedField}
      >
        {m.studio_keyboard_done()}
      </button>
      <button
        type="button"
        onClick={onClose}
        aria-label={m.studio_close()}
        className="studio-close"
      >
        <X aria-hidden="true" />
      </button>
    </div>
  )
}

type StudioSheetProps = {
  meme: StudioMeme
}

export const StudioSheet = ({ meme }: StudioSheetProps) => {
  const isHydrated = useHydrated()
  const studio = useStudio(meme)
  const { close } = useStudioHistory()
  const dialogRef = useSheetDialog(close)
  const sheetRef = useSheetKeyboard()
  const scrimRef = React.useRef<HTMLDivElement>(null)
  const titleId = React.useId()

  useSheetDrag({ sheetRef, scrimRef, onDismiss: close })

  return (
    <dialog
      ref={dialogRef}
      open
      aria-labelledby={titleId}
      className="studio dark"
      data-entering={isHydrated || undefined}
    >
      <div
        ref={scrimRef}
        aria-hidden="true"
        className="studio-scrim"
        onClick={close}
      />
      <div ref={sheetRef} className="studio-sheet">
        <span aria-hidden="true" className="studio-sheet-grabber" />
        <StudioHeader meme={meme} titleId={titleId} onClose={close} />
        <StudioEditor studio={studio} meme={meme} />
      </div>
    </dialog>
  )
}
