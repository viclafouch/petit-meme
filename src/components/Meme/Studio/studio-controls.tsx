import React from 'react'
import { StudioTemplates } from '@/components/Meme/Studio/studio-templates'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type {
  StudioBandColorValue,
  StudioFontColorValue,
  StudioFontFamilyId,
  StudioFontSizeValue,
  StudioSettings,
  StudioTextPosition
} from '@/constants/studio'
import {
  STUDIO_BAND_COLORS,
  STUDIO_COLORS,
  STUDIO_FONT_SIZES,
  STUDIO_FONTS,
  STUDIO_TEXT_MAX_LENGTH
} from '@/constants/studio'
import { cn } from '@/lib/utils'

type ColorSwatchesParams = {
  colors: readonly {
    readonly id: string
    readonly label: string
    readonly value: string
    readonly className: string
  }[]
  activeValue: string
  onSelect: (value: string) => void
}

const ColorSwatches = ({
  colors,
  activeValue,
  onSelect
}: ColorSwatchesParams) => {
  return (
    <div className="flex gap-3">
      {colors.map((color) => {
        return (
          <button
            key={color.id}
            type="button"
            aria-label={color.label}
            data-active={activeValue === color.value || undefined}
            className={cn(
              'size-7 rounded-full border-2 border-border cursor-pointer transition-colors',
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
  hideTextInput?: boolean
}

export const StudioControls = ({
  settings,
  onSettingsChange,
  disabled,
  hideTextInput = false
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

  return (
    <fieldset disabled={disabled} className="flex flex-col gap-4">
      {!hideTextInput ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="studio-text">Texte</Label>
          <Input
            id="studio-text"
            value={settings.text}
            onChange={handleTextChange}
            placeholder="Texte à ajouter sur la vidéo"
            autoComplete="off"
            type="text"
            maxLength={STUDIO_TEXT_MAX_LENGTH}
          />
          <span className="text-xs text-muted-foreground">
            {settings.text.length}/{STUDIO_TEXT_MAX_LENGTH}
          </span>
        </div>
      ) : null}
      <div className="flex flex-col gap-1.5">
        <Label>Templates</Label>
        <StudioTemplates />
      </div>
      <Separator />
      <div className="flex flex-col gap-1.5">
        <Label>Position</Label>
        <ToggleGroup
          type="single"
          variant="outline"
          value={settings.textPosition}
          onValueChange={handlePositionChange}
          className="w-full"
        >
          <ToggleGroupItem value="top" className="flex-1">
            Haut
          </ToggleGroupItem>
          <ToggleGroupItem value="bottom" className="flex-1">
            Bas
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Police</Label>
        <Select
          value={settings.fontFamily}
          onValueChange={handleFontFamilyChange}
        >
          <SelectTrigger className="w-full">
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
        <Label>Taille</Label>
        <ToggleGroup
          type="single"
          variant="outline"
          value={String(settings.fontSize)}
          onValueChange={handleFontSizeChange}
          className="w-full"
        >
          {STUDIO_FONT_SIZES.map((size) => {
            return (
              <ToggleGroupItem
                key={size.id}
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
        <Label>Couleur du texte</Label>
        <ColorSwatches
          colors={STUDIO_COLORS}
          activeValue={settings.fontColor}
          onSelect={handleFontColorChange}
        />
      </div>
      <div className="flex flex-col gap-2.5">
        <Label>Fond du texte</Label>
        <ColorSwatches
          colors={STUDIO_BAND_COLORS}
          activeValue={settings.bandColor}
          onSelect={handleBandColorChange}
        />
      </div>
    </fieldset>
  )
}
