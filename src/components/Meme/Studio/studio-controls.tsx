import React from 'react'
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
  STUDIO_TEXT_MAX_LENGTH
} from '~/constants/studio'
import type {
  StudioBandColorValue,
  StudioColorEntry,
  StudioFontColorValue,
  StudioFontFamilyId,
  StudioFontSizeValue,
  StudioSettings,
  StudioTextPosition
} from '~/constants/studio'
import { cn } from '~/lib/utils'
import { m } from '~/paraglide/messages.js'

type ColorSwatchesParams = {
  colors: StudioColorEntry[]
  activeValue: string
  onSelect: (value: string) => void
  labelledBy: string
}

const ColorSwatches = ({
  colors,
  activeValue,
  onSelect,
  labelledBy
}: ColorSwatchesParams) => {
  return (
    <div className="flex gap-3" role="radiogroup" aria-labelledby={labelledBy}>
      {colors.map((color) => {
        const isSelected = activeValue === color.value

        return (
          <button
            key={color.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={color.label}
            data-active={isSelected || undefined}
            className={cn(
              'size-6 rounded-full border-2 border-border transition-colors',
              'data-active:ring-2 data-active:ring-primary data-active:ring-offset-2 data-active:ring-offset-background',
              color.className
            )}
            onClick={() => {
              onSelect(color.value)
            }}
          />
        )
      })}
    </div>
  )
}

type StudioControlsParams = {
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
}: StudioControlsParams) => {
  const handleTextChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onSettingsChange({ text: event.target.value })
  }

  const handlePositionChange = (value: string) => {
    if (value) {
      onSettingsChange({ textPosition: value as StudioTextPosition })
    }
  }

  const handleFontFamilyChange = (value: string) => {
    onSettingsChange({ fontFamily: value as StudioFontFamilyId })
  }

  const handleFontSizeChange = (value: string) => {
    if (value) {
      onSettingsChange({ fontSize: Number(value) as StudioFontSizeValue })
    }
  }

  const handleFontColorChange = (value: string) => {
    onSettingsChange({ fontColor: value as StudioFontColorValue })
  }

  const handleBandColorChange = (value: string) => {
    onSettingsChange({ bandColor: value as StudioBandColorValue })
  }

  const fontSizes = getStudioFontSizes()
  const colors = getStudioColors()
  const bandColors = getStudioBandColors()

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
