import { createStore } from '@tanstack/react-store'
import {
  STUDIO_DEFAULT_SETTINGS,
  STUDIO_TEMPLATE_STYLES,
  type StudioSettings,
  type StudioTemplateId
} from '~/constants/studio'

const STUDIO_TEMPLATES_BY_ID = new Map(
  STUDIO_TEMPLATE_STYLES.map((template) => {
    return [template.id, template]
  })
)

type StudioState = {
  settings: StudioSettings
  activeTemplateId: StudioTemplateId | null
}

const INITIAL_STUDIO_STATE: StudioState = {
  settings: STUDIO_DEFAULT_SETTINGS,
  activeTemplateId: 'caption'
}

export const studioStore = createStore(INITIAL_STUDIO_STATE, ({ setState }) => {
  return {
    setSettings: (updates: Partial<StudioSettings>) => {
      const hasStyleChange = Object.keys(updates).some((key) => {
        return key !== 'text'
      })

      setState((prev) => {
        return {
          settings: { ...prev.settings, ...updates },
          activeTemplateId: hasStyleChange ? null : prev.activeTemplateId
        }
      })
    },
    applyTemplate: (templateId: StudioTemplateId) => {
      const template = STUDIO_TEMPLATES_BY_ID.get(templateId)

      if (!template) {
        return
      }

      const { id, ...style } = template

      setState((prev) => {
        return {
          settings: { ...prev.settings, ...style },
          activeTemplateId: id
        }
      })
    }
  }
})
