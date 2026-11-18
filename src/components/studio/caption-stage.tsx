import React from 'react'
import { useMemeHls } from '~/components/meme/use-meme-hls'
import { StageControls } from '~/components/studio/stage-controls'
import type { StudioMeme } from '~/components/studio/use-studio'
import {
  CAPTION_SLOT_LABELS,
  CAPTION_TEXT_MAX_LENGTH,
  type Caption,
  type CaptionSlot
} from '~/constants/studio'
import {
  WATERMARK_ASSET_PATH,
  WATERMARK_WIDTH_RATIO
} from '~/constants/watermark'
import {
  estimateCaptionText,
  getBlockTop,
  getCaptionLook,
  getCaptionStrokeWidth,
  layoutCaption,
  listFilledCaptionSlots,
  type CaptionBlockLayout,
  type CaptionLayout
} from '~/helpers/caption'
import { getWatermarkMargin } from '~/helpers/watermark'
import { buildVideoFirstFrameUrl } from '~/lib/bunny-public-urls'
import {
  loadCaptionFonts,
  measureCaptionText
} from '~/lib/studio/caption-canvas'

const PLACEHOLDER_SIZING_TEXT = 'Mg'
const CARET_LINE_TEXT = '\u200B'
const IOS_NO_ZOOM_FONT_PX = 16
const CAPTION_INNER_WIDTH_RATIO = 0.9
const PERCENT = 100
const NO_OPEN_SLOTS: CaptionSlot[] = []

const toCqw = (value: number, width: number) => {
  return `${(value / width) * PERCENT}cqw`
}

const buildZoomSafeStyle = (
  block: CaptionBlockLayout,
  layout: CaptionLayout,
  framePx: number
): React.CSSProperties | null => {
  if (framePx === 0) {
    return null
  }

  const pxPerUnit = framePx / layout.width
  const fontPx = block.fontSize * pxPerUnit

  if (fontPx >= IOS_NO_ZOOM_FONT_PX) {
    return null
  }

  const scale = IOS_NO_ZOOM_FONT_PX / fontPx

  return {
    position: 'absolute',
    top: 0,
    left: `${((1 - CAPTION_INNER_WIDTH_RATIO) / 2) * framePx}px`,
    width: `${CAPTION_INNER_WIDTH_RATIO * framePx * scale}px`,
    height: `${block.blockHeight * pxPerUnit * scale}px`,
    transform: `scale(${1 / scale})`,
    transformOrigin: '0 0',
    '--caption-font-size': `${IOS_NO_ZOOM_FONT_PX}px`,
    '--caption-line-height': `${block.lineHeight * pxPerUnit * scale}px`,
    '--caption-stroke': `${getCaptionStrokeWidth(block.fontSize) * pxPerUnit * scale}px`
  }
}

type CaptionTextProps = {
  block: CaptionBlockLayout
  layout: CaptionLayout
  caption: Caption
  framePx: number
  field?: CaptionFieldProps
}

type CaptionFieldProps = {
  placeholder: string
  onChange: (slot: CaptionSlot, text: string) => void
  onFocusSlot: (slot: CaptionSlot | null) => void
  inputRef: (slot: CaptionSlot, element: HTMLTextAreaElement | null) => void
}

const CaptionText = ({
  block,
  layout,
  caption,
  framePx,
  field
}: CaptionTextProps) => {
  const look = getCaptionLook(caption.look)
  const { slot } = block
  const style = {
    '--caption-font-size': toCqw(block.fontSize, layout.width),
    '--caption-line-height': toCqw(block.lineHeight, layout.width),
    '--caption-stroke': toCqw(
      getCaptionStrokeWidth(block.fontSize),
      layout.width
    ),
    fontFamily: `"${look.fontFamily}"`,
    textTransform: look.isUppercase ? 'uppercase' : undefined
  } satisfies React.CSSProperties
  const hasStroke = look.strokeColor !== null || undefined

  if (field === undefined) {
    return (
      <p className="studio-caption-text" style={style} data-stroke={hasStroke}>
        {block.lines.join('\n')}
      </p>
    )
  }

  return (
    // oxlint-disable-next-line react/forbid-elements -- the field is drawn as the caption itself, so it takes none of the form field look
    <textarea
      ref={(element) => {
        field.inputRef(slot, element)
      }}
      className="studio-caption-input"
      style={{ ...style, ...buildZoomSafeStyle(block, layout, framePx) }}
      data-stroke={hasStroke}
      value={caption[slot]}
      rows={1}
      maxLength={CAPTION_TEXT_MAX_LENGTH}
      placeholder={field.placeholder}
      aria-label={CAPTION_SLOT_LABELS[slot]()}
      autoComplete="off"
      autoCapitalize="sentences"
      spellCheck={false}
      onChange={(event) => {
        field.onChange(slot, event.target.value)
      }}
      onFocus={() => {
        field.onFocusSlot(slot)
      }}
      onBlur={(event) => {
        const trimmed = event.currentTarget.value.replace(/\n+$/u, '')

        if (trimmed !== event.currentTarget.value) {
          field.onChange(slot, trimmed)
        }

        field.onFocusSlot(null)
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault()
          event.currentTarget.blur()
        }
      }}
    />
  )
}

const useCaptionFontsReady = () => {
  const [isReady, setIsReady] = React.useState(false)

  React.useEffect(() => {
    let isMounted = true

    const waitForFonts = async () => {
      await loadCaptionFonts()

      if (isMounted) {
        setIsReady(true)
      }
    }

    void waitForFonts()

    return () => {
      isMounted = false
    }
  }, [])

  return isReady
}

const useElementWidth = () => {
  const [width, setWidth] = React.useState(0)
  const observerRef = React.useRef<ResizeObserver | null>(null)

  const ref = React.useCallback((element: HTMLElement | null) => {
    observerRef.current?.disconnect()

    if (element === null) {
      return
    }

    observerRef.current = new ResizeObserver(([entry]) => {
      if (entry !== undefined) {
        setWidth(entry.contentRect.width)
      }
    })
    observerRef.current.observe(element)
  }, [])

  return [ref, width] as const
}

const getWatermarkStyle = (meme: StudioMeme) => {
  const minSide = Math.min(meme.width, meme.height)
  const margin = toCqw(getWatermarkMargin(minSide), meme.width)

  return {
    width: toCqw(minSide * WATERMARK_WIDTH_RATIO, meme.width),
    right: margin,
    bottom: margin
  }
}

type StageVideoProps = {
  meme: StudioMeme
  watermark: React.ReactNode
}

const StageVideo = ({ meme, watermark }: StageVideoProps) => {
  const { video, videoCallbackRef } = useMemeHls({ memeId: meme.id })
  const [isPlaying, setIsPlaying] = React.useState(false)

  return (
    <>
      <video
        ref={videoCallbackRef}
        className="studio-video"
        muted
        autoPlay
        loop
        playsInline
        disablePictureInPicture
        tabIndex={-1}
        aria-hidden="true"
        data-playing={isPlaying || undefined}
        onPlaying={() => {
          setIsPlaying(true)
        }}
      />
      {watermark}
      <StageControls video={video} />
    </>
  )
}

type CaptionStageProps = {
  meme: StudioMeme
  caption: Caption
  showWatermark: boolean
  openSlots?: CaptionSlot[]
  field?: CaptionFieldProps
  renderSlotAction?: (slot: CaptionSlot) => React.ReactNode
}

export const CaptionStage = ({
  meme,
  caption,
  showWatermark,
  openSlots = NO_OPEN_SLOTS,
  field,
  renderSlotAction
}: CaptionStageProps) => {
  const areFontsReady = useCaptionFontsReady()
  const [frameRef, framePx] = useElementWidth()
  const look = getCaptionLook(caption.look)
  const isEditable = field !== undefined
  const watermark = showWatermark ? (
    <img
      src={WATERMARK_ASSET_PATH}
      alt=""
      data-testid="studio-watermark"
      className="studio-watermark"
      style={getWatermarkStyle(meme)}
    />
  ) : null

  const sizeSlot = (slot: CaptionSlot) => {
    const text = caption[slot]

    if (text.trim() === '') {
      return openSlots.includes(slot) ? PLACEHOLDER_SIZING_TEXT : text
    }

    return isEditable && text.endsWith('\n')
      ? `${text}${CARET_LINE_TEXT}`
      : text
  }

  const layout = layoutCaption({
    caption: { ...caption, top: sizeSlot('top'), bottom: sizeSlot('bottom') },
    width: meme.width,
    videoHeight: meme.height,
    measureText: areFontsReady ? measureCaptionText : estimateCaptionText,
    sharedSlotCount: listFilledCaptionSlots(caption).length
  })

  return (
    <div
      ref={frameRef}
      data-testid="studio-frame"
      className="studio-frame"
      style={{ '--frame-ratio': `${layout.width} / ${layout.outputHeight}` }}
    >
      <div
        className="studio-video-box"
        style={{
          top: toCqw(layout.topBandHeight, layout.width),
          height: toCqw(layout.videoHeight, layout.width)
        }}
      >
        <img
          src={buildVideoFirstFrameUrl(meme.bunnyId)}
          alt=""
          className="studio-video-poster"
          fetchPriority={isEditable ? 'high' : undefined}
          decoding="async"
        />
        {isEditable ? (
          <StageVideo meme={meme} watermark={watermark} />
        ) : (
          watermark
        )}
      </div>
      {layout.blocks.map((block) => {
        return (
          <div
            key={block.slot}
            className="studio-caption-block"
            data-slot={block.slot}
            data-band={look.isBand || undefined}
            style={{
              top: toCqw(getBlockTop(layout, block), layout.width),
              height: toCqw(block.blockHeight, layout.width),
              '--caption-background': look.backgroundColor ?? undefined,
              '--caption-color': look.textColor
            }}
          >
            <CaptionText
              block={block}
              layout={layout}
              caption={caption}
              framePx={framePx}
              field={field}
            />
            {renderSlotAction?.(block.slot)}
          </div>
        )
      })}
    </div>
  )
}
