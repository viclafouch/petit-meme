import type { StudioTemplate } from '@/constants/studio'
import { getStudioTemplates, STUDIO_FONTS } from '@/constants/studio'
import { buildVideoImageUrl } from '@/lib/bunny'
import { cn } from '@/lib/utils'
import { m } from '@/paraglide/messages.js'
import { useStudioStore } from '@/stores/studio.store'

const PREVIEW_FONT_SIZE = 14

const buildBandStyle = (template: StudioTemplate) => {
  const font = STUDIO_FONTS.find((entry) => {
    return entry.id === template.fontFamily
  })

  const backgroundColor =
    template.bandOpacity < 1
      ? `color-mix(in srgb, ${template.bandColor} ${Math.round(template.bandOpacity * 100)}%, transparent)`
      : template.bandColor

  return {
    backgroundColor,
    fontSize: `${PREVIEW_FONT_SIZE}px`,
    color: template.fontColor,
    fontFamily: font?.cssFamily ?? 'Arial, sans-serif',
    lineHeight: 1.3
  } as const
}

const BUTTON_BASE_CLASSES =
  'flex-1 rounded-lg border border-border overflow-hidden cursor-pointer transition-shadow'
const BUTTON_ACTIVE_CLASSES =
  'data-active:ring-2 data-active:ring-primary data-active:ring-offset-2 data-active:ring-offset-background'

type TemplateCardParams = {
  template: StudioTemplate
  thumbnailUrl: string
  isSelected: boolean
  onSelect: () => void
}

const CaptionTemplateCard = ({
  template,
  thumbnailUrl,
  isSelected,
  onSelect
}: TemplateCardParams) => {
  const bandElement = (
    <div
      className="py-1 text-center"
      style={buildBandStyle(template)}
      aria-hidden="true"
    >
      Abc
    </div>
  )

  return (
    <button
      type="button"
      role="radio"
      aria-checked={isSelected}
      aria-label={template.label}
      data-active={isSelected || undefined}
      className={cn(
        'flex flex-col',
        BUTTON_BASE_CLASSES,
        BUTTON_ACTIVE_CLASSES
      )}
      onClick={onSelect}
    >
      {template.textPosition === 'top' ? bandElement : null}
      <img
        src={thumbnailUrl}
        alt=""
        aria-hidden="true"
        className="aspect-video w-full object-cover"
        loading="lazy"
        decoding="async"
      />
      {template.textPosition === 'bottom' ? bandElement : null}
    </button>
  )
}

const OverlayTemplateCard = ({
  template,
  thumbnailUrl,
  isSelected,
  onSelect
}: TemplateCardParams) => {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={isSelected}
      aria-label={template.label}
      data-active={isSelected || undefined}
      className={cn(
        'relative aspect-video',
        BUTTON_BASE_CLASSES,
        BUTTON_ACTIVE_CLASSES
      )}
      onClick={onSelect}
    >
      <img
        src={thumbnailUrl}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 size-full object-cover"
        loading="lazy"
        decoding="async"
      />
      <div
        className={cn(
          'absolute inset-x-0 py-1 text-center',
          template.textPosition === 'top' ? 'top-0' : 'bottom-0'
        )}
        style={buildBandStyle(template)}
        aria-hidden="true"
      >
        Abc
      </div>
    </button>
  )
}

type StudioTemplatesParams = {
  bunnyId: string
}

export const StudioTemplates = ({ bunnyId }: StudioTemplatesParams) => {
  const activeTemplateId = useStudioStore((state) => {
    return state.activeTemplateId
  })
  const applyTemplate = useStudioStore((state) => {
    return state.applyTemplate
  })

  const thumbnailUrl = buildVideoImageUrl(bunnyId)
  const templates = getStudioTemplates()

  return (
    <div
      className="flex gap-2"
      role="radiogroup"
      aria-label={m.studio_templates()}
    >
      {templates.map((template) => {
        const isSelected = activeTemplateId === template.id

        const handleSelect = () => {
          applyTemplate(template.id)
        }

        return template.bandOpacity < 1 ? (
          <OverlayTemplateCard
            key={template.id}
            template={template}
            thumbnailUrl={thumbnailUrl}
            isSelected={isSelected}
            onSelect={handleSelect}
          />
        ) : (
          <CaptionTemplateCard
            key={template.id}
            template={template}
            thumbnailUrl={thumbnailUrl}
            isSelected={isSelected}
            onSelect={handleSelect}
          />
        )
      })}
    </div>
  )
}
