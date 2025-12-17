import { customErrorAdapter } from '@/constants/error'
import { createStart } from '@tanstack/react-start'

export const startInstance = createStart(() => {
  return {
    defaultSsr: true,
    serializationAdapters: [customErrorAdapter]
  }
})
