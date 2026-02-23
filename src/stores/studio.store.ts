import { create } from 'zustand'
import type { StudioSettings, StudioTemplateId } from '@/constants/studio'
import { STUDIO_DEFAULT_SETTINGS, STUDIO_TEMPLATES } from '@/constants/studio'

const STUDIO_TEMPLATES_BY_ID = new Map(
  STUDIO_TEMPLATES.map((template) => {
    return [template.id, template]
  })
)

type StudioStore = {
  settings: StudioSettings
  activeTemplateId: StudioTemplateId | null
  setSettings: (updates: Partial<StudioSettings>) => void
  applyTemplate: (templateId: StudioTemplateId) => void
  resetSettings: () => void
}

export const useStudioStore = create<StudioStore>((set) => {
  return {
    settings: STUDIO_DEFAULT_SETTINGS,
    activeTemplateId: null,
    setSettings: (updates) => {
      const hasStyleChange = Object.keys(updates).some((key) => {
        return key !== 'text'
      })

      set((prev) => {
        return {
          settings: { ...prev.settings, ...updates },
          activeTemplateId: hasStyleChange ? null : prev.activeTemplateId
        }
      })
    },
    applyTemplate: (templateId) => {
      const template = STUDIO_TEMPLATES_BY_ID.get(templateId)

      if (!template) {
        return
      }

      const { id, label, description, ...style } = template

      set((prev) => {
        return {
          settings: { ...prev.settings, ...style },
          activeTemplateId: id
        }
      })
    },
    resetSettings: () => {
      set({ settings: STUDIO_DEFAULT_SETTINGS, activeTemplateId: null })
    }
  }
})
