declare module 'hls.js/light' {
  // oxlint-disable-next-line petit-meme/no-re-export -- hls.js ships no types for its light build, which exposes the full build's API minus optional controllers
  export { default } from 'hls.js'
}
