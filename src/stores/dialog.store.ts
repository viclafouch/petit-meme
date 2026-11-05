import React from 'react'
import { createStore } from '@tanstack/react-store'
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
  'audio-upsell': {
    component: React.lazy(async () => {
      const { AudioUpsellDialog } =
        await import('~/components/Meme/audio-upsell-dialog')

      return { default: AudioUpsellDialog }
    })
  },
  'ai-search-upsell': {
    component: React.lazy(async () => {
      const { AiSearchUpsellDialog } =
        await import('~/components/Meme/ai-search-upsell-dialog')

      return { default: AiSearchUpsellDialog }
    })
  },
  'studio-upsell': {
    component: React.lazy(async () => {
      const { StudioUpsellDialog } =
        await import('~/components/Meme/studio-upsell-dialog')

      return { default: StudioUpsellDialog }
    })
  },
  'bookmark-upsell': {
    component: React.lazy(async () => {
      const { BookmarkUpsellDialog } =
        await import('~/components/Meme/bookmark-upsell-dialog')

      return { default: BookmarkUpsellDialog }
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

type DefaultDialogProps = keyof WithDialog

type DialogPropsMap = {
  [TKey in DialogKey]: Omit<
    React.ComponentProps<Dialogs[TKey]['component']>,
    DefaultDialogProps
  >
}

type DialogPropsArgs<TKey extends DialogKey> =
  Partial<DialogPropsMap[TKey]> extends DialogPropsMap[TKey]
    ? []
    : [props: DialogPropsMap[TKey]]

type DialogComponentMap = {
  [TKey in DialogKey]: React.ComponentType<WithDialog<DialogPropsMap[TKey]>>
}

const DIALOG_COMPONENTS: DialogComponentMap = {
  auth: DIALOGS.auth.component,
  'watermark-upsell': DIALOGS['watermark-upsell'].component,
  'audio-upsell': DIALOGS['audio-upsell'].component,
  'ai-search-upsell': DIALOGS['ai-search-upsell'].component,
  'studio-upsell': DIALOGS['studio-upsell'].component,
  'bookmark-upsell': DIALOGS['bookmark-upsell'].component,
  'premium-reminder': DIALOGS['premium-reminder'].component
}

type RenderDialog = (dialogState: WithDialog) => React.ReactNode

type DialogState = {
  renderDialog: RenderDialog | null
  isOpen: boolean
}

const INITIAL_DIALOG_STATE: DialogState = {
  renderDialog: null,
  isOpen: false
}

export const dialogStore = createStore(INITIAL_DIALOG_STATE, ({ setState }) => {
  return {
    forceCloseDialog: () => {
      setState(() => {
        return INITIAL_DIALOG_STATE
      })
    },
    closeDialog: () => {
      setState((prev) => {
        return { ...prev, isOpen: false }
      })
    },
    showDialog: <TKey extends DialogKey>(
      name: TKey,
      ...[props]: DialogPropsArgs<TKey>
    ) => {
      setState(() => {
        return {
          renderDialog: (dialogState) => {
            return React.createElement(
              DIALOG_COMPONENTS[name],
              Object.assign(dialogState, props)
            )
          },
          isOpen: true
        }
      })
    }
  }
})
