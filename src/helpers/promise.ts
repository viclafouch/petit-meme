export async function withTimeout<TResult>(
  run: (abortController: AbortController) => Promise<TResult>,
  ms: number,
  message: string
): Promise<TResult> {
  const abortController = new AbortController()
  let timer: ReturnType<typeof setTimeout> | undefined

  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      const timeoutError = new Error(message)
      abortController.abort(timeoutError)
      reject(timeoutError)
    }, ms)
  })

  try {
    return await Promise.race([run(abortController), timeout])
  } finally {
    clearTimeout(timer)
  }
}

export type LatchEnd = 'release' | 'hold'

export const createLatch = <TArgs extends unknown[]>(
  task: (...args: TArgs) => Promise<LatchEnd>
) => {
  let isLocked = false

  const run = async (...args: TArgs) => {
    if (isLocked) {
      return
    }

    isLocked = true

    try {
      isLocked = (await task(...args)) === 'hold'
    } catch (error) {
      isLocked = false
      throw error
    }
  }

  const release = () => {
    isLocked = false
  }

  return { run, release }
}
