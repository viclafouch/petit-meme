import { execFileSync, spawn } from 'node:child_process'
import { existsSync, mkdirSync, openSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'

const STATE_DIR = join(homedir(), '.cache/phone-skill')
const WDA_SOURCE = join(STATE_DIR, 'appium-ios')
const WDA_PROJECT = join(WDA_SOURCE, 'packages/webdriveragent/WebDriverAgent.xcodeproj')
const WDA_BUILD = join(STATE_DIR, 'wda-build')
const WDA_BUNDLE_ID = process.env.WDA_BUNDLE_ID ?? 'io.petitmeme.WebDriverAgentRunner'
const PIDS_FILE = join(STATE_DIR, 'pids.json')
const CDP_URL = 'http://127.0.0.1:9222'
const WDA_PORT = 8100
const MJPEG_PORT = 9100

const sleep = (milliseconds) => {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

const run = (command, args) => {
  return execFileSync(command, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
}

const readPids = () => {
  return existsSync(PIDS_FILE) ? JSON.parse(readFileSync(PIDS_FILE, 'utf8')) : {}
}

const startDetached = (name, command, args) => {
  mkdirSync(STATE_DIR, { recursive: true })
  const log = openSync(join(STATE_DIR, `${name}.log`), 'w')
  const child = spawn(command, args, { detached: true, stdio: ['ignore', log, log] })
  child.unref()
  writeFileSync(PIDS_FILE, JSON.stringify({ ...readPids(), [name]: child.pid }))
}

const findDevice = () => {
  const output = join(tmpdir(), `devicectl-${process.pid}.json`)
  run('xcrun', ['devicectl', 'list', 'devices', '--json-output', output])
  const { result } = JSON.parse(readFileSync(output, 'utf8'))
  rmSync(output)
  const iphones = result.devices.filter((device) => {
    return device.hardwareProperties.platform === 'iOS' && device.connectionProperties.pairingState === 'paired'
  })
  if (iphones.length !== 1) {
    throw new Error(`Expected one paired iPhone, found ${iphones.length}: plug it in with the cable and unlock it`)
  }
  return { identifier: iphones[0].identifier, udid: iphones[0].hardwareProperties.udid }
}

const findTunnelAddress = () => {
  const details = run('xcrun', ['devicectl', 'device', 'info', 'details', '--device', findDevice().identifier])
  const address = details.match(/tunnelIPAddress: (\S+)/)?.[1]
  if (!address) {
    throw new Error('No CoreDevice tunnel: plug the iPhone in with the cable and unlock it')
  }
  return address
}

const wdaUrl = (port = WDA_PORT) => {
  return `http://[${findTunnelAddress()}]:${port}`
}

const wda = async (path, body) => {
  const init = body === undefined ? {} : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }
  const response = await fetch(`${wdaUrl()}${path}`, init)
  return (await response.json()).value
}

const findSession = async () => {
  const response = await fetch(`${wdaUrl()}/status`)
  const status = await response.json()
  if (status.sessionId) {
    return status.sessionId
  }
  const created = await wda('/session', { capabilities: { alwaysMatch: {} } })
  return created.sessionId
}

const touch = async (actions) => {
  const session = await findSession()
  await wda(`/session/${session}/actions`, {
    actions: [{ type: 'pointer', id: 'finger', parameters: { pointerType: 'touch' }, actions }]
  })
}

const findTeam = () => {
  const certificate = run('security', ['find-certificate', '-c', 'Apple Development', '-p'])
  const subject = execFileSync('openssl', ['x509', '-noout', '-subject'], { input: certificate, encoding: 'utf8' })
  const team = subject.match(/OU\s*=\s*([A-Z0-9]{10})/)?.[1]
  if (!team) {
    throw new Error('No Apple Development certificate: sign in to Xcode › Settings › Accounts')
  }
  return team
}

const findXctestrun = () => {
  const products = join(WDA_BUILD, 'Build/Products')
  const file = existsSync(products) && readdirSync(products).find((name) => name.endsWith('.xctestrun'))
  return file ? join(products, file) : null
}

const buildWda = () => {
  if (!existsSync(WDA_PROJECT)) {
    mkdirSync(STATE_DIR, { recursive: true })
    run('git', ['clone', '--depth', '1', '--filter=blob:none', '--sparse', 'https://github.com/appium/appium-ios.git', WDA_SOURCE])
    run('git', ['-C', WDA_SOURCE, 'sparse-checkout', 'set', 'packages/webdriveragent'])
  }
  run('xcodebuild', [
    'build-for-testing', '-project', WDA_PROJECT, '-scheme', 'WebDriverAgentRunner',
    '-destination', `id=${findDevice().udid}`, '-derivedDataPath', WDA_BUILD, '-allowProvisioningUpdates',
    `DEVELOPMENT_TEAM=${findTeam()}`, 'CODE_SIGN_STYLE=Automatic', `PRODUCT_BUNDLE_IDENTIFIER=${WDA_BUNDLE_ID}`
  ])
}

const waitFor = async (check, label) => {
  for (let attempt = 0; attempt < 90; attempt += 1) {
    if (await check().catch(() => false)) {
      return
    }
    await sleep(1000)
  }
  throw new Error(`${label} did not answer within 90 s`)
}

const listPages = async () => {
  const response = await fetch(`${CDP_URL}/json/list`)
  const targets = await response.json()
  return targets.filter((target) => target.type === 'page')
}

const connectPage = async (urlPart) => {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const page = (await listPages()).find((target) => target.url.includes(urlPart))
    if (page) {
      const socket = new WebSocket(page.webSocketDebuggerUrl ?? `ws://127.0.0.1:9222/devtools/page/${page.id}`)
      await new Promise((resolve, reject) => {
        socket.addEventListener('open', resolve, { once: true })
        socket.addEventListener('error', reject, { once: true })
      })
      return socket
    }
    await sleep(500)
  }
  throw new Error(`No Safari tab matches "${urlPart}". Open it first with: iphone.mjs open <url>`)
}

const evaluate = async (urlPart, expression) => {
  const socket = await connectPage(urlPart)
  const message = await new Promise((resolve) => {
    socket.addEventListener('message', (event) => {
      const data = JSON.parse(event.data)
      if (data.id === 1) {
        resolve(data)
      }
    })
    socket.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression, returnByValue: true, awaitPromise: true } }))
  })
  socket.close()
  if (message.result?.exceptionDetails) {
    throw new Error(message.result.exceptionDetails.exception?.description ?? 'Evaluation failed')
  }
  return message.result?.result?.value
}

const commands = {
  connect: async () => {
    const { udid } = findDevice()
    findTunnelAddress()
    if (!findXctestrun()) {
      buildWda()
    }
    startDetached('cdp', 'pymobiledevice3', ['webinspector', 'cdp', '--native'])
    startDetached('wda', 'xcodebuild', ['test-without-building', '-xctestrun', findXctestrun(), '-destination', `id=${udid}`])
    await waitFor(async () => (await fetch(`${wdaUrl()}/status`)).ok, 'WebDriverAgent')
    await waitFor(async () => (await fetch(`${CDP_URL}/json/list`)).ok, 'The Web Inspector bridge')
    const session = await findSession()
    await wda(`/session/${session}/appium/settings`, {
      settings: { waitForIdleTimeout: 0, animationCoolOffTimeout: 0, mjpegServerFramerate: 60, mjpegScalingFactor: 50 }
    })
    console.log('connected: Web Inspector bridge on 9222, WebDriverAgent ready')
  },
  pages: async () => {
    for (const page of await listPages()) {
      console.log(page.url)
    }
  },
  open: async (url) => {
    run('xcrun', ['devicectl', 'device', 'process', 'launch', '--device', findDevice().identifier, '--payload-url', url, 'com.apple.mobilesafari'])
    await evaluate(url, "new Promise((resolve) => document.readyState === 'complete' ? resolve() : addEventListener('load', resolve, { once: true }))")
    console.log(`opened ${url}`)
  },
  eval: async (urlPart, expression) => {
    console.log(JSON.stringify(await evaluate(urlPart, expression), null, 1))
  },
  tap: async (urlPart, selector) => {
    const point = await evaluate(urlPart, `(() => {
      const element = document.querySelector(${JSON.stringify(selector)})
      if (!element) return null
      const rect = element.getBoundingClientRect()
      return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }
    })()`)
    if (!point) {
      throw new Error(`No element matches ${selector}`)
    }
    const screen = await wda('/wda/screen')
    const x = Math.round(point.x)
    const y = Math.round(point.y + screen.statusBarSize.height)
    await touch([
      { type: 'pointerMove', duration: 0, x, y },
      { type: 'pointerDown', button: 0 },
      { type: 'pause', duration: 50 },
      { type: 'pointerUp', button: 0 }
    ])
    console.log(`tapped ${selector} at ${x},${y}`)
  },
  swipe: async (fromY, toY, durationMs = '80', holdMs = '0', x = '195') => {
    await touch([
      { type: 'pointerMove', duration: 0, x: Number(x), y: Number(fromY) },
      { type: 'pointerDown', button: 0 },
      { type: 'pointerMove', duration: Number(durationMs), x: Number(x), y: Number(toY) },
      { type: 'pause', duration: Number(holdMs) },
      { type: 'pointerUp', button: 0 }
    ])
    console.log(`swiped ${fromY} to ${toY} in ${durationMs} ms, held ${holdMs} ms`)
  },
  size: async () => {
    const session = await findSession()
    console.log(JSON.stringify(await wda(`/session/${session}/window/size`)))
  },
  shot: async (file) => {
    writeFileSync(file, Buffer.from(await wda('/screenshot'), 'base64'))
    console.log(`saved ${file}`)
  },
  record: async (seconds, file) => {
    execFileSync('ffmpeg', [
      '-loglevel', 'error', '-y', '-use_wallclock_as_timestamps', '1', '-f', 'mjpeg', '-t', String(seconds),
      '-i', wdaUrl(MJPEG_PORT), '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', file
    ])
    console.log(`saved ${file}`)
  },
  sheet: async (video, out, fps = '4') => {
    execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', video, '-vf', `fps=${fps},scale=180:-1,tile=10x2`, '-frames:v', '1', out])
    console.log(`saved ${out}`)
  },
  clean: async () => {
    for (const [name, pid] of Object.entries(readPids())) {
      try {
        process.kill(pid)
        console.log(`stopped ${name}`)
      } catch {
        console.log(`${name} already stopped`)
      }
    }
    rmSync(PIDS_FILE, { force: true })
  }
}

const [command, ...args] = process.argv.slice(2)
if (!commands[command]) {
  console.log('Usage: node iphone.mjs <connect|pages|open|eval|tap|swipe|size|shot|record|sheet|clean> [args]')
  process.exit(1)
}
await commands[command](...args)
