import fs from 'node:fs/promises'
import { signOriginalUrl } from '~/lib/bunny'

const FETCH_TIMEOUT_MS = 30_000

export const downloadOriginalVideo = async (
  bunnyId: string,
  destPath: string
) => {
  const response = await fetch(await signOriginalUrl(bunnyId), {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }

  await fs.writeFile(destPath, Buffer.from(await response.arrayBuffer()))
}
