import React from 'react'
import { RadioGroup } from 'radix-ui'
import { StudioTemplates } from '~/components/Meme/Studio/studio-templates'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '~/components/ui/select'
import { Separator } from '~/components/ui/separator'
import { ToggleGroup, ToggleGroupItem } from '~/components/ui/toggle-group'
import {
  getStudioBandColors,
  getStudioColors,
  getStudioFontSizes,
  STUDIO_FONTS,
  STUDIO_TEXT_MAX_LENGTH,
  STUDIO_TEXT_POSITIONS,
  type StudioBandColorValue,
  type StudioColorEntry,
  type StudioFontColorValue,
  type StudioSettings
} from '~/constants/studio'
import { SELECTED_TILE_RING_CLASS_NAME } from '~/constants/ui'
import { cn } from '~/lib/utils'
import { m } from '~/paraglide/messages.js'

type ColorSwatchesProps<TValue extends string> = {
  colors: StudioColorEntry<TValue>[]
  activeValue: TValue
  onSelect: (value: TValue) => void
  labelledBy: string
}

const ColorSwatches = <TValue extends string>({
  colors,
  activeValue,
  onSelect,
  labelledBy
}: ColorSwatchesProps<TValue>) => {
  return (
    <RadioGroup.Root
      value={activeValue}
      className="flex gap-3"
      aria-labelledby={labelledBy}
    >
      {colors.map((color) => {
        const isSelected = activeValue === color.value

        return (
          <RadioGroup.Item
            key={color.id}
            value={color.value}
            aria-label={color.label}
            data-active={isSelected || undefined}
            className={cn(
              'size-6 rounded-full border-2 border-border transition-colors',
              SELECTED_TILE_RING_CLASS_NAME,
              color.className
            )}
            onClick={() => {
              onSelect(color.value)
            }}
          />
        )
      })}
    </RadioGroup.Root>
  )
}

type StudioControlsProps = {
  settings: StudioSettings
  onSettingsChange: (updates: Partial<StudioSettings>) => void
  disabled: boolean
  bunnyId: string
  hideTextInput?: boolean
  onTextInputFocus?: () => void
}

export const StudioControls = ({
  settings,
  onSettingsChange,
  disabled,
  bunnyId,
  hideTextInput = false,
  onTextInputFocus
}: StudioControlsProps) => {
  const fontSizes = getStudioFontSizes()
  const colors = getStudioColors()
  const bandColors = getStudioBandColors()

  const handleTextChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onSettingsChange({ text: event.target.value })
  }

  const handlePositionChange = (value: string) => {
    const textPosition = STUDIO_TEXT_POSITIONS.find((position) => {
      return position === value
    })

    if (textPosition !== undefined) {
      onSettingsChange({ textPosition })
    }
  }

  const handleFontFamilyChange = (value: string) => {
    const font = STUDIO_FONTS.find((entry) => {
      return entry.id === value
    })

    if (font !== undefined) {
      onSettingsChange({ fontFamily: font.id })
    }
  }

  const handleFontSizeChange = (value: string) => {
    const fontSize = fontSizes.find((size) => {
      return String(size.value) === value
    })

    if (fontSize !== undefined) {
      onSettingsChange({ fontSize: fontSize.value })
    }
  }

  const handleFontColorChange = (value: StudioFontColorValue) => {
    onSettingsChange({ fontColor: value })
  }

  const handleBandColorChange = (value: StudioBandColorValue) => {
    onSettingsChange({ bandColor: value })
  }

  return (
    <fieldset disabled={disabled} className="flex flex-col gap-4">
      {!hideTextInput ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="studio-text">{m.studio_text_label()}</Label>
          <Input
            id="studio-text"
            value={settings.text}
            onChange={handleTextChange}
            onFocus={onTextInputFocus}
            placeholder={m.studio_text_aria()}
            autoComplete="off"
            type="text"
            maxLength={STUDIO_TEXT_MAX_LENGTH}
            aria-describedby="studio-text-count"
          />
          <span
            id="studio-text-count"
            className="text-xs text-muted-foreground"
            aria-live="polite"
          >
            {settings.text.length}/{STUDIO_TEXT_MAX_LENGTH}
          </span>
        </div>
      ) : null}
      <div className="flex flex-col gap-1.5">
        <Label id="studio-templates-label">{m.studio_templates()}</Label>
        <StudioTemplates bunnyId={bunnyId} />
      </div>
      <Separator />
      <div className="flex flex-col gap-1.5">
        <Label id="studio-position-label">{m.studio_position()}</Label>
        <ToggleGroup
          type="single"
          variant="outline"
          value={settings.textPosition}
          onValueChange={handlePositionChange}
          className="w-full"
          aria-labelledby="studio-position-label"
        >
          <ToggleGroupItem value="top" className="flex-1">
            {m.studio_position_top()}
          </ToggleGroupItem>
          <ToggleGroupItem value="bottom" className="flex-1">
            {m.studio_position_bottom()}
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label id="studio-font-label">{m.studio_font()}</Label>
        <Select
          value={settings.fontFamily}
          onValueChange={handleFontFamilyChange}
        >
          <SelectTrigger className="w-full" aria-labelledby="studio-font-label">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STUDIO_FONTS.map((font) => {
              return (
                <SelectItem key={font.id} value={font.id}>
                  {font.label}
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label id="studio-size-label">{m.studio_size()}</Label>
        <ToggleGroup
          type="single"
          variant="outline"
          value={String(settings.fontSize)}
          onValueChange={handleFontSizeChange}
          className="w-full"
          aria-labelledby="studio-size-label"
        >
          {fontSizes.map((size) => {
            return (
              <ToggleGroupItem
                key={size.value}
                value={String(size.value)}
                className="flex-1"
              >
                {size.label}
              </ToggleGroupItem>
            )
          })}
        </ToggleGroup>
      </div>
      <div className="flex flex-col gap-2.5">
        <Label id="studio-font-color-label">{m.studio_font_color()}</Label>
        <ColorSwatches
          colors={colors}
          activeValue={settings.fontColor}
          onSelect={handleFontColorChange}
          labelledBy="studio-font-color-label"
        />
      </div>
      <div className="flex flex-col gap-2.5">
        <Label id="studio-band-color-label">{m.studio_band_color()}</Label>
        <ColorSwatches
          colors={bandColors}
          activeValue={settings.bandColor}
          onSelect={handleBandColorChange}
          labelledBy="studio-band-color-label"
        />
      </div>
    </fieldset>
  )
}
