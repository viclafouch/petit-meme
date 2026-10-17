import { RadioGroup } from 'radix-ui'
import {
  getStudioTemplates,
  STUDIO_FONTS,
  type StudioTemplate
} from '~/constants/studio'
import { SELECTED_TILE_RING_CLASS_NAME } from '~/constants/ui'
import { buildVideoImageUrl } from '~/lib/bunny'
import { cn } from '~/lib/utils'
import { m } from '~/paraglide/messages.js'
import { useStudioStore } from '~/stores/studio.store'

const PREVIEW_FONT_SIZE = 14
const PERCENT = 100

const buildBandStyle = (template: StudioTemplate) => {
  const font = STUDIO_FONTS.find((entry) => {
    return entry.id === template.fontFamily
  })

  const backgroundColor =
    template.bandOpacity < 1
      ? `color-mix(in srgb, ${template.bandColor} ${Math.round(template.bandOpacity * PERCENT)}%, transparent)`
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

type CaptionTemplateCardProps = {
  template: StudioTemplate
  thumbnailUrl: string
  isSelected: boolean
  onSelect: () => void
}

type OverlayTemplateCardProps = CaptionTemplateCardProps

const CaptionTemplateCard = ({
  template,
  thumbnailUrl,
  isSelected,
  onSelect
}: CaptionTemplateCardProps) => {
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
    <RadioGroup.Item
      value={template.id}
      aria-label={template.label}
      data-active={isSelected || undefined}
      className={cn(
        'flex flex-col',
        BUTTON_BASE_CLASSES,
        SELECTED_TILE_RING_CLASS_NAME
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
    </RadioGroup.Item>
  )
}

const OverlayTemplateCard = ({
  template,
  thumbnailUrl,
  isSelected,
  onSelect
}: OverlayTemplateCardProps) => {
  return (
    <RadioGroup.Item
      value={template.id}
      aria-label={template.label}
      data-active={isSelected || undefined}
      className={cn(
        'relative aspect-video',
        BUTTON_BASE_CLASSES,
        SELECTED_TILE_RING_CLASS_NAME
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
    </RadioGroup.Item>
  )
}

type StudioTemplatesProps = {
  bunnyId: string
}

export const StudioTemplates = ({ bunnyId }: StudioTemplatesProps) => {
  const activeTemplateId = useStudioStore((state) => {
    return state.activeTemplateId
  })
  const applyTemplate = useStudioStore((state) => {
    return state.applyTemplate
  })

  const thumbnailUrl = buildVideoImageUrl(bunnyId)
  const templates = getStudioTemplates()

  return (
    <RadioGroup.Root
      value={activeTemplateId ?? ''}
      className="flex gap-2"
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
    </RadioGroup.Root>
  )
}
