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
