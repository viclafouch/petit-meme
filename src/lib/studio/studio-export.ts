import type {
  StudioExportRequest,
  StudioExportResponse
} from '~/lib/studio/studio-export.worker'

type PendingRequest = {
  resolve: (response: StudioExportResponse) => void
  onProgress?: (progress: number) => void
}

type RequestWithoutId = StudioExportRequest extends infer TRequest
  ? TRequest extends { id: number }
    ? Omit<TRequest, 'id'>
    : never
  : never

export class StudioRenderUnsupportedError extends Error {
  constructor() {
    super('This browser cannot encode H.264 video')
    this.name = 'StudioRenderUnsupportedError'
  }
}

export class StudioRenderCanceledError extends Error {
  constructor() {
    super('The render was canceled')
    this.name = 'StudioRenderCanceledError'
  }
}

let worker: Worker | null = null
let lastRequestId = 0
const pendingRequests = new Map<number, PendingRequest>()

const handleWorkerMessage = (event: MessageEvent<StudioExportResponse>) => {
  const response = event.data
  const pendingRequest = pendingRequests.get(response.id)

  if (pendingRequest === undefined) {
    return
  }

  if (response.type === 'progress') {
    pendingRequest.onProgress?.(response.progress)

    return
  }

  pendingRequests.delete(response.id)
  pendingRequest.resolve(response)
}

const getWorker = () => {
  if (worker === null) {
    worker = new Worker(new URL('studio-export.worker.ts', import.meta.url), {
      type: 'module',
      name: 'studio-export'
    })
    worker.addEventListener('message', handleWorkerMessage)
  }

  return worker
}

const send = (
  request: RequestWithoutId,
  transfer: Transferable[],
  onProgress?: (progress: number) => void
) => {
  lastRequestId += 1
  const id = lastRequestId
  const response = new Promise<StudioExportResponse>((resolve) => {
    pendingRequests.set(id, { resolve, onProgress })
  })

  getWorker().postMessage({ ...request, id }, { transfer })

  return { id, response }
}

const throwUnexpectedResponse = (response: StudioExportResponse): never => {
  if (response.type === 'unsupported') {
    throw new StudioRenderUnsupportedError()
  }

  if (response.type === 'canceled') {
    throw new StudioRenderCanceledError()
  }

  throw new Error(
    response.type === 'failed' ? response.message : 'Unexpected worker reply'
  )
}

const H264_PROBE = { codec: 'avc1.42001e', width: 640, height: 360 } as const

export const matchCanCreateStudioVideo = async () => {
  if (!('VideoEncoder' in globalThis) || !('VideoDecoder' in globalThis)) {
    return false
  }

  const [encoderSupport, decoderSupport] = await Promise.all([
    VideoEncoder.isConfigSupported(H264_PROBE),
    VideoDecoder.isConfigSupported({
      codec: H264_PROBE.codec,
      codedWidth: H264_PROBE.width,
      codedHeight: H264_PROBE.height
    })
  ])

  return encoderSupport.supported === true && decoderSupport.supported === true
}

export const probeStudioSource = async (source: Blob) => {
  const { response } = send({ type: 'probe', source }, [])
  const settled = await response

  if (settled.type !== 'probed') {
    return throwUnexpectedResponse(settled)
  }

  return { width: settled.width, height: settled.height }
}

const readRenderedVideo = async (response: Promise<StudioExportResponse>) => {
  const settled = await response

  if (settled.type !== 'rendered') {
    return throwUnexpectedResponse(settled)
  }

  return new Blob([settled.buffer], { type: 'video/mp4' })
}

type RenderStudioVideoParams = Omit<
  Extract<StudioExportRequest, { type: 'render' }>,
  'type' | 'id'
> & {
  onProgress: (progress: number) => void
}

export const renderStudioVideo = ({
  onProgress,
  overlay,
  ...params
}: RenderStudioVideoParams) => {
  const { id, response } = send(
    { type: 'render', overlay, ...params },
    [overlay],
    onProgress
  )

  return {
    video: readRenderedVideo(response),
    cancel: () => {
      getWorker().postMessage({ type: 'cancel', id }, { transfer: [] })
    }
  }
}
