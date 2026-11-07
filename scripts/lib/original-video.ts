import fs from 'node:fs/promises'
import { fetchOriginalVideo } from '~/lib/bunny.server'

const FETCH_TIMEOUT_MS = 30_000

export const downloadOriginalVideo = async (
  bunnyId: string,
  destPath: string
) => {
  const response = await fetchOriginalVideo(bunnyId, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }

  await fs.writeFile(destPath, Buffer.from(await response.arrayBuffer()))
}
