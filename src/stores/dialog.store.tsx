import React from 'react'
import { create } from 'zustand'
import type { WithDialog } from '@/@types/dialog'
import { OverlaySpinner } from '@/components/ui/overlay-spinner'
import { ClientOnly } from '@tanstack/react-router'

export const DIALOGS = {
  auth: {
    component: React.lazy(async () => {
      return {
        default: await import('@/components/User/auth-dialog').then((mod) => {
          return mod.AuthDialog
        })
      }
    })
  }
} as const

type Dialogs = typeof DIALOGS
type DialogKey = keyof Dialogs

type DefaultDialogProps = keyof WithDialog<unknown>

const initialState: {
  component: Dialogs[DialogKey]['component'] | null
  componentName: DialogKey | null
  componentProps: React.ComponentProps<Dialogs[DialogKey]['component']> | null
  forceCloseDialog: () => void
} = {
  component: null,
  componentProps: null,
  componentName: null,
  forceCloseDialog: () => {}
}

export const useDialog = create<
  typeof initialState & {
    closeDialog: () => void
    showDialog: <T extends DialogKey>(
      componentName: T,
      componentProps: Omit<
        React.ComponentProps<Dialogs[T]['component']>,
        DefaultDialogProps
      >
    ) => void
  }
>((set) => {
  return {
    ...initialState,
    forceCloseDialog: () => {
      set((prev) => {
        return {
          ...prev,
          component: null,
          componentProps: null,
          componentName: null
        }
      })
    },
    closeDialog: () => {
      set((prev) => {
        return {
          componentProps: {
            ...prev.componentProps,
            open: false,
            onOpenChange: prev.closeDialog
          }
        }
      })
    },
    showDialog: <T extends DialogKey>(
      componentName: T,
      componentProps: Omit<
        React.ComponentProps<Dialogs[T]['component']>,
        DefaultDialogProps
      >
    ) => {
      const modal = DIALOGS[componentName]

      if (!modal) {
        throw new Error(
          `The modal '${componentName}' has no existing component`
        )
      }

      set((prev) => {
        return {
          component: modal.component,
          componentName: componentName as T,
          componentProps: {
            ...componentProps,
            open: true,
            onOpenChange: prev.closeDialog
          }
        }
      })
    }
  }
})

export function useShowDialog() {
  return useDialog((state) => {
    return state.showDialog
  })
}

export const DialogProvider = ({ children }: { children: React.ReactNode }) => {
  const { component: Component, componentProps, forceCloseDialog } = useDialog()

  return (
    <>
      {children}
      <ClientOnly>
        {Component && componentProps ? (
          <React.Suspense
            fallback={
              <OverlaySpinner
                onClick={() => {
                  return forceCloseDialog()
                }}
              />
            }
          >
            <Component {...componentProps} />
          </React.Suspense>
        ) : null}
      </ClientOnly>
    </>
  )
}
