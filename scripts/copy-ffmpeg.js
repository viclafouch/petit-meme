import { cpSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

const SOURCE = resolve('node_modules/@ffmpeg/core-mt/dist/esm')
const DEST = resolve('public/ffmpeg')

mkdirSync(DEST, { recursive: true })

for (const file of [
  'ffmpeg-core.js',
  'ffmpeg-core.wasm',
  'ffmpeg-core.worker.js'
]) {
  cpSync(resolve(SOURCE, file), resolve(DEST, file))
}
