import React from 'react'
import { createStoreContext, type Store } from '@tanstack/react-store'
import type { WithDialog } from '~/@types/dialog'

type DialogEntry = {
  component: React.ExoticComponent<never>
}

const DIALOGS = {
  auth: {
    component: React.lazy(async () => {
      const { AuthDialog } = await import('~/components/auth/auth-dialog')

      return { default: AuthDialog }
    })
  },
  'install-app': {
    component: React.lazy(async () => {
      const { InstallAppDialog } =
        await import('~/components/install/install-app-dialog')

      return { default: InstallAppDialog }
    })
  },
  'audio-upsell': {
    component: React.lazy(async () => {
      const { AudioUpsellDialog } =
        await import('~/components/premium/audio-upsell-dialog')

      return { default: AudioUpsellDialog }
    })
  },
  'ai-search-upsell': {
    component: React.lazy(async () => {
      const { AiSearchUpsellDialog } =
        await import('~/components/premium/ai-search-upsell-dialog')

      return { default: AiSearchUpsellDialog }
    })
  },
  'studio-upsell': {
    component: React.lazy(async () => {
      const { StudioUpsellDialog } =
        await import('~/components/premium/studio-upsell-dialog')

      return { default: StudioUpsellDialog }
    })
  },
  'bookmark-upsell': {
    component: React.lazy(async () => {
      const { BookmarkUpsellDialog } =
        await import('~/components/premium/bookmark-upsell-dialog')

      return { default: BookmarkUpsellDialog }
    })
  },
  'premium-reminder': {
    component: React.lazy(async () => {
      const { PremiumReminderDialog } =
        await import('~/components/premium/premium-reminder-dialog')

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
  'install-app': DIALOGS['install-app'].component,
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

export const INITIAL_DIALOG_STATE: DialogState = {
  renderDialog: null,
  isOpen: false
}

export const createDialogActions = ({
  setState
}: Pick<Store<DialogState>, 'setState'>) => {
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
}

type DialogStore = Store<DialogState, ReturnType<typeof createDialogActions>>

export const {
  StoreProvider: DialogStoreProvider,
  useStoreContext: useDialogStore
} = createStoreContext<DialogStore>()
