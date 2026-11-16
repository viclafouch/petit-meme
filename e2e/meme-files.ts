import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import type { Download } from '@playwright/test'
import { ORIGINAL_ACCESS_HEADER } from '~/constants/bunny'
import { FIVE_MINUTES_IN_SECONDS, SECOND } from '~/constants/time'
import { signVideoFileUrl } from '~/server/platforms/bunny-token.server'
import {
  E2E_BUNNY_HOSTNAME,
  E2E_BUNNY_ORIGINAL_ACCESS_KEY,
  E2E_BUNNY_TOKEN_AUTH_KEY,
  E2E_VIDEO_BUNNY_ID
} from './env'

const ORIGINAL_FETCH_GIVE_UP_MS = 15_000

const hashBytes = (bytes: Uint8Array) => {
  return createHash('sha256').update(bytes).digest('hex')
}

const fetchOriginalVideoDigest = async () => {
  const url = await signVideoFileUrl({
    hostname: E2E_BUNNY_HOSTNAME,
    videoId: E2E_VIDEO_BUNNY_ID,
    file: 'original',
    securityKey: E2E_BUNNY_TOKEN_AUTH_KEY,
    expiresAt: Math.floor(Date.now() / SECOND) + FIVE_MINUTES_IN_SECONDS
  })
  const response = await fetch(url, {
    headers: { [ORIGINAL_ACCESS_HEADER]: E2E_BUNNY_ORIGINAL_ACCESS_KEY },
    signal: AbortSignal.timeout(ORIGINAL_FETCH_GIVE_UP_MS)
  })

  if (!response.ok) {
    throw new Error(`The original video answered ${response.status}`)
  }

  return hashBytes(new Uint8Array(await response.arrayBuffer()))
}

let originalVideoDigestPromise: Promise<string> | null = null

export const readOriginalVideoDigest = () => {
  originalVideoDigestPromise ??= fetchOriginalVideoDigest()

  return originalVideoDigestPromise
}

export const readDownloadedFile = async (download: Download) => {
  const bytes = await readFile(await download.path())

  return {
    fileName: download.suggestedFilename(),
    sha256: hashBytes(bytes),
    isEmpty: bytes.length === 0
  }
}
