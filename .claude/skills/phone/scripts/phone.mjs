import { execFileSync } from 'node:child_process'
import { existsSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const ADB_CANDIDATES = [join(homedir(), 'Library/Android/sdk/platform-tools/adb'), 'adb']
const ADB = ADB_CANDIDATES.find((candidate) => candidate === 'adb' || existsSync(candidate))
const TAILSCALE_CANDIDATES = ['/Applications/Tailscale.app/Contents/MacOS/Tailscale', 'tailscale']
const TAILSCALE = TAILSCALE_CANDIDATES.find((candidate) => candidate === 'tailscale' || existsSync(candidate))
const CDP_PORT = process.env.CDP_PORT ?? '9223'
const SERIAL_ARGS = process.env.ANDROID_SERIAL ? ['-s', process.env.ANDROID_SERIAL] : []

const adb = (...args) => {
  return execFileSync(ADB, [...SERIAL_ARGS, ...args], { maxBuffer: 256 * 1024 * 1024 })
}

const sleep = (milliseconds) => {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

const forwardDevtools = () => {
  adb('forward', `tcp:${CDP_PORT}`, 'localabstract:chrome_devtools_remote')
}

const listPages = async () => {
  forwardDevtools()
  const response = await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)
  const targets = await response.json()
  return targets.filter((target) => target.type === 'page')
}

const findPage = async (urlPart) => {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const page = (await listPages()).find((target) => target.url.includes(urlPart))
    if (page) {
      return page
    }
    await sleep(500)
  }
  throw new Error(`No Chrome tab matches "${urlPart}". Open it first with: phone.mjs open <url>`)
}

const connect = async (urlPart) => {
  const page = await findPage(urlPart)
  const socket = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true })
    socket.addEventListener('error', reject, { once: true })
  })
  let nextId = 0
  const pending = new Map()
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data)
    const resolver = pending.get(message.id)
    if (resolver) {
      pending.delete(message.id)
      resolver(message)
    }
  })
  const send = (method, params = {}) => {
    nextId += 1
    const id = nextId
    socket.send(JSON.stringify({ id, method, params }))
    return new Promise((resolve) => pending.set(id, resolve))
  }
  const evaluate = async (expression) => {
    const { result } = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.exception?.description ?? 'Evaluation failed')
    }
    return result.result.value
  }
  return { send, evaluate, close: () => socket.close() }
}

const commands = {
  devices: async () => {
    console.log(execFileSync(ADB, ['devices', '-l']).toString())
  },
  pages: async () => {
    for (const page of await listPages()) {
      console.log(page.url)
    }
  },
  open: async (url) => {
    adb('shell', `am start -a android.intent.action.VIEW -d '${url}' com.android.chrome`)
    const page = await connect(url)
    await page.evaluate("new Promise((resolve) => document.readyState === 'complete' ? resolve() : addEventListener('load', resolve, { once: true }))")
    page.close()
    console.log(`opened ${url}`)
  },
  tap: async (urlPart, selector) => {
    const page = await connect(urlPart)
    const point = await page.evaluate(`(() => {
      const element = document.querySelector(${JSON.stringify(selector)})
      if (!element) return null
      const rect = element.getBoundingClientRect()
      return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }
    })()`)
    if (!point) {
      throw new Error(`No element matches ${selector}`)
    }
    await page.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] })
    await page.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    page.close()
    console.log(`tapped ${selector} at ${Math.round(point.x)},${Math.round(point.y)}`)
  },
  eval: async (urlPart, expression) => {
    const page = await connect(urlPart)
    console.log(JSON.stringify(await page.evaluate(expression), null, 1))
    page.close()
  },
  frames: async (urlPart, durationMs = '3000') => {
    const page = await connect(urlPart)
    const samples = await page.evaluate(`new Promise((resolve) => {
      const samples = []
      const startedAt = performance.now()
      const sample = () => {
        const focused = document.activeElement
        const rect = focused && focused !== document.body ? focused.getBoundingClientRect() : null
        samples.push({ t: Math.round(performance.now() - startedAt), vvHeight: Math.round(visualViewport.height), vvTop: Math.round(visualViewport.offsetTop), innerHeight, scrollY: Math.round(scrollY), focused: focused?.tagName ?? null, focusedTop: rect ? Math.round(rect.top) : null })
        if (performance.now() - startedAt < ${Number(durationMs)}) requestAnimationFrame(sample)
        else resolve(samples)
      }
      requestAnimationFrame(sample)
    })`)
    page.close()
    let previous = ''
    for (const sample of samples) {
      const { t, ...state } = sample
      const key = JSON.stringify(state)
      if (key !== previous) {
        console.log(t, key)
      }
      previous = key
    }
  },
  shot: async (file) => {
    writeFileSync(file, adb('exec-out', 'screencap', '-p'))
    console.log(`saved ${file}`)
  },
  record: async (seconds, file, size) => {
    const remote = `/sdcard/phone-${Date.now()}.mp4`
    const sizeArgs = size ? ['--size', size] : []
    adb('shell', 'screenrecord', '--time-limit', String(seconds), '--bit-rate', '12000000', ...sizeArgs, remote)
    await sleep(800)
    adb('pull', remote, file)
    adb('shell', 'rm', remote)
    console.log(`saved ${file}`)
  },
  sheet: async (video, out, fps = '4') => {
    execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', video, '-vf', `fps=${fps},scale=180:-1,tile=10x2`, out])
    console.log(`saved ${out}`)
  },
  connect: async (port) => {
    if (!port) {
      throw new Error('Pass the port shown on the phone under Developer options › Wireless debugging')
    }
    const status = JSON.parse(execFileSync(TAILSCALE, ['status', '--json']))
    const phones = Object.values(status.Peer ?? {}).filter((peer) => peer.OS === 'android' && peer.Online)
    if (phones.length !== 1) {
      throw new Error(`Expected one online Android device on the tailnet, found ${phones.length}`)
    }
    process.stdout.write(execFileSync(ADB, ['connect', `${phones[0].TailscaleIPs[0]}:${port}`]))
  },
  adb: async (...args) => {
    process.stdout.write(adb(...args))
  },
  clean: async () => {
    adb('forward', '--remove-all')
    adb('reverse', '--remove-all')
    execFileSync(ADB, ['disconnect'])
    console.log('forwards, reverses and wireless connection removed')
  },
  awake: async () => {
    const power = adb('shell', 'dumpsys', 'power').toString().match(/mWakefulness=(\w+)/)?.[1]
    const locked = adb('shell', 'dumpsys', 'window').toString().match(/isKeyguardShowing=(\w+)/)?.[1]
    console.log(JSON.stringify({ wakefulness: power, locked: locked === 'true' }))
  }
}

const [command, ...args] = process.argv.slice(2)
if (!commands[command]) {
  console.log('Usage: node phone.mjs <connect|devices|awake|pages|open|tap|eval|frames|shot|record|sheet|adb|clean> [args]')
  process.exit(1)
}
await commands[command](...args)
