import type React from 'react'
import { useCreateStore } from '@tanstack/react-store'
import {
  createStudioActions,
  INITIAL_STUDIO_STATE,
  StudioStoreProvider
} from '~/stores/studio.store'

type StudioProviderProps = {
  children: React.ReactNode
}

export const StudioProvider = ({ children }: StudioProviderProps) => {
  const studioStore = useCreateStore(INITIAL_STUDIO_STATE, createStudioActions)

  return (
    <StudioStoreProvider value={studioStore}>{children}</StudioStoreProvider>
  )
}
