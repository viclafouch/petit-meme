import type { StudioPlan } from '~/constants/studio'
import { createSteppedProgress } from '~/helpers/progress'
import { probeStudioSource } from '~/lib/studio/studio-export'
import { getMemeExportFile } from '~/server/meme/meme.functions'

type SourceProgressListener = (progress: number) => void

const SOURCE_CACHE_NAME = 'studio-sources-v1'
const SOURCE_CACHE_LIMIT = 6

const progressListeners = new Map<string, Set<SourceProgressListener>>()

const buildSourceCacheKey = (memeId: string, plan: StudioPlan) => {
  return `/studio-source/${memeId}?plan=${plan}`
}

const reportProgress = (cacheKey: string, progress: number) => {
  for (const listener of progressListeners.get(cacheKey) ?? []) {
    listener(progress)
  }
}

type ListenToStudioSourceProgressParams = {
  memeId: string
  plan: StudioPlan
  listener: SourceProgressListener
}

export const listenToStudioSourceProgress = ({
  memeId,
  plan,
  listener
}: ListenToStudioSourceProgressParams) => {
  const cacheKey = buildSourceCacheKey(memeId, plan)
  const listeners = progressListeners.get(cacheKey) ?? new Set()

  listeners.add(listener)
  progressListeners.set(cacheKey, listeners)

  return () => {
    listeners.delete(listener)
  }
}

const readCachedSource = async (cacheKey: string) => {
  if (!('caches' in globalThis)) {
    return null
  }

  try {
    const cache = await caches.open(SOURCE_CACHE_NAME)
    const response = await cache.match(cacheKey)

    return response === undefined ? null : await response.blob()
  } catch {
    return null
  }
}

const storeCachedSource = async (cacheKey: string, source: Blob) => {
  if (!('caches' in globalThis)) {
    return
  }

  const cache = await caches.open(SOURCE_CACHE_NAME)
  await cache.put(
    cacheKey,
    new Response(source, { headers: { 'content-type': source.type } })
  )
  const keys = await cache.keys()

  await Promise.all(
    keys
      .slice(0, Math.max(0, keys.length - SOURCE_CACHE_LIMIT))
      .map((staleKey) => {
        return cache.delete(staleKey)
      })
  )
}

const readWithProgress = async (
  response: Response,
  onProgress: (progress: number) => void
) => {
  const total = Number(response.headers.get('content-length') ?? 0)

  if (response.body === null || total === 0) {
    return response.blob()
  }

  let received = 0
  const reportStep = createSteppedProgress(onProgress)
  const countedBody = response.body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform: (chunk, controller) => {
        received += chunk.byteLength
        reportStep(received / total)
        controller.enqueue(chunk)
      }
    })
  )

  return new Response(countedBody, { headers: response.headers }).blob()
}

type FetchStudioSourceParams = {
  memeId: string
  plan: StudioPlan
}

const readSource = async ({ memeId, plan }: FetchStudioSourceParams) => {
  const cacheKey = buildSourceCacheKey(memeId, plan)
  const cachedSource = await readCachedSource(cacheKey)

  if (cachedSource !== null) {
    reportProgress(cacheKey, 1)

    return cachedSource
  }

  const response = await getMemeExportFile({
    data: { memeId, mode: 'studio', format: 'mp4' }
  })
  const source = await readWithProgress(response, (progress) => {
    reportProgress(cacheKey, progress)
  })

  void Promise.allSettled([storeCachedSource(cacheKey, source)])

  return source
}

export const fetchStudioSource = async (params: FetchStudioSourceParams) => {
  const blob = await readSource(params)
  const { width, height } = await probeStudioSource(blob)

  return { blob, width, height }
}
