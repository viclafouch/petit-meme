import React from 'react'
import { create } from 'zustand'
import type { WithDialog } from '~/@types/dialog'

type DialogEntry = {
  component: React.ExoticComponent<never>
}

const DIALOGS = {
  auth: {
    component: React.lazy(async () => {
      const { AuthDialog } = await import('~/components/User/auth-dialog')

      return { default: AuthDialog }
    })
  },
  'watermark-upsell': {
    component: React.lazy(async () => {
      const { WatermarkUpsellDialog } =
        await import('~/components/Meme/watermark-upsell-dialog')

      return { default: WatermarkUpsellDialog }
    })
  },
  'ai-search-upsell': {
    component: React.lazy(async () => {
      const { AiSearchUpsellDialog } =
        await import('~/components/Meme/ai-search-upsell-dialog')

      return { default: AiSearchUpsellDialog }
    })
  },
  'premium-reminder': {
    component: React.lazy(async () => {
      const { PremiumReminderDialog } =
        await import('~/components/premium-reminder-dialog')

      return { default: PremiumReminderDialog }
    })
  }
} as const satisfies Record<string, DialogEntry>

type Dialogs = typeof DIALOGS

type DialogKey = keyof Dialogs

type DefaultDialogProps = keyof WithDialog<unknown>

type DialogPropsMap = {
  [TKey in DialogKey]: Omit<
    React.ComponentProps<Dialogs[TKey]['component']>,
    DefaultDialogProps
  >
}

type DialogComponentMap = {
  [TKey in DialogKey]: React.ComponentType<WithDialog<DialogPropsMap[TKey]>>
}

const DIALOG_COMPONENTS: DialogComponentMap = {
  auth: DIALOGS.auth.component,
  'watermark-upsell': DIALOGS['watermark-upsell'].component,
  'ai-search-upsell': DIALOGS['ai-search-upsell'].component,
  'premium-reminder': DIALOGS['premium-reminder'].component
}

type RenderDialog = (dialogState: WithDialog<unknown>) => React.ReactNode

type DialogStore = {
  renderDialog: RenderDialog | null
  isOpen: boolean
  forceCloseDialog: () => void
  closeDialog: () => void
  showDialog: <TKey extends DialogKey>(
    name: TKey,
    props: DialogPropsMap[TKey]
  ) => void
}

export const useDialog = create<DialogStore>((set) => {
  return {
    renderDialog: null,
    isOpen: false,
    forceCloseDialog: () => {
      set({ renderDialog: null, isOpen: false })
    },
    closeDialog: () => {
      set({ isOpen: false })
    },
    showDialog: (name, props) => {
      set({
        renderDialog: (dialogState) => {
          return React.createElement(DIALOG_COMPONENTS[name], {
            ...props,
            ...dialogState
          })
        },
        isOpen: true
      })
    }
  }
})

type DialogState = ReturnType<typeof useDialog.getState>

export const matchIsDialogOpen = (state: DialogState) => {
  return state.isOpen
}
