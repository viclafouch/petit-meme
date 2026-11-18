import {
  BlobSource,
  BufferTarget,
  canEncodeVideo,
  Conversion,
  ConversionCanceledError,
  Input,
  MP4,
  Mp4OutputFormat,
  Output,
  QTFF,
  Quality
} from 'mediabunny'
import { createSteppedProgress } from '~/helpers/progress'

export type StudioExportRequest =
  | { type: 'probe'; id: number; source: Blob }
  | {
      type: 'render'
      id: number
      source: Blob
      overlay: ImageBitmap
      width: number
      videoTop: number
      videoHeight: number
      outputHeight: number
    }
  | { type: 'cancel'; id: number }

export type StudioExportResponse =
  | { type: 'probed'; id: number; width: number; height: number }
  | { type: 'progress'; id: number; progress: number }
  | { type: 'rendered'; id: number; buffer: ArrayBuffer }
  | { type: 'unsupported'; id: number }
  | { type: 'canceled'; id: number }
  | { type: 'failed'; id: number; message: string }

type ProbeParams = Extract<StudioExportRequest, { type: 'probe' }>

type RenderParams = Extract<StudioExportRequest, { type: 'render' }>

const conversions = new Map<number, Conversion>()

const reply = (
  response: StudioExportResponse,
  transfer: Transferable[] = []
) => {
  globalThis.postMessage(response, { transfer })
}

const openInput = (source: Blob) => {
  return new Input({ source: new BlobSource(source), formats: [MP4, QTFF] })
}

const probe = async ({ id, source }: ProbeParams) => {
  const input = openInput(source)

  try {
    const videoTrack = await input.getPrimaryVideoTrack()

    if (videoTrack === null) {
      throw new Error('The source has no video track')
    }

    reply({
      type: 'probed',
      id,
      width: await videoTrack.getDisplayWidth(),
      height: await videoTrack.getDisplayHeight()
    })
  } finally {
    input.dispose()
  }
}

const render = async ({
  id,
  source,
  overlay,
  width,
  videoTop,
  videoHeight,
  outputHeight
}: RenderParams) => {
  const isEncodable = await canEncodeVideo('avc', {
    width,
    height: outputHeight
  })

  if (!isEncodable) {
    overlay.close()
    reply({ type: 'unsupported', id })

    return
  }

  const input = openInput(source)
  const output = new Output({
    format: new Mp4OutputFormat({ fastStart: 'in-memory' }),
    target: new BufferTarget()
  })
  const context = new OffscreenCanvas(width, outputHeight).getContext('2d')

  try {
    if (context === null) {
      throw new Error('OffscreenCanvas 2D is unavailable')
    }

    const conversion = await Conversion.init({
      input,
      output,
      tracks: 'primary',
      tags: {},
      video: {
        codec: 'avc',
        quality: new Quality('high'),
        allowTransformationMetadata: false,
        processedWidth: width,
        processedHeight: outputHeight,
        process: (sample) => {
          context.clearRect(0, 0, width, outputHeight)
          sample.draw(context, 0, videoTop, width, videoHeight)
          context.drawImage(overlay, 0, 0)

          return context.canvas
        }
      }
    })

    if (!conversion.isValid) {
      reply({ type: 'unsupported', id })

      return
    }

    conversions.set(id, conversion)
    conversion.onProgress = createSteppedProgress((progress) => {
      reply({ type: 'progress', id, progress })
    })

    await conversion.execute()

    const { buffer } = output.target

    if (buffer === null) {
      throw new Error('The conversion produced no file')
    }

    reply({ type: 'rendered', id, buffer }, [buffer])
  } finally {
    conversions.delete(id)
    overlay.close()
    input.dispose()
  }
}

type TaskRequest = Exclude<StudioExportRequest, { type: 'cancel' }>

const runTask = async (request: TaskRequest) => {
  try {
    await (request.type === 'probe' ? probe(request) : render(request))
  } catch (error) {
    if (error instanceof ConversionCanceledError) {
      reply({ type: 'canceled', id: request.id })

      return
    }

    reply({
      type: 'failed',
      id: request.id,
      message: error instanceof Error ? error.message : String(error)
    })
  }
}

globalThis.addEventListener(
  'message',
  (event: MessageEvent<StudioExportRequest>) => {
    const request = event.data

    if (request.type === 'cancel') {
      void conversions.get(request.id)?.cancel()

      return
    }

    void runTask(request)
  }
)
