import { z } from 'zod'

const NETWORK_INFORMATION_SCHEMA = z.object({
  saveData: z.boolean().optional(),
  effectiveType: z.string().optional()
})

const SLOW_EFFECTIVE_TYPES = new Set(['slow-2g', '2g'])

export const matchIsDataSaverOn = () => {
  if (typeof navigator === 'undefined' || !('connection' in navigator)) {
    return false
  }

  const { data } = NETWORK_INFORMATION_SCHEMA.safeParse(navigator.connection)

  return (
    data?.saveData === true ||
    SLOW_EFFECTIVE_TYPES.has(data?.effectiveType ?? '')
  )
}
