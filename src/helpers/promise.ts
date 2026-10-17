export async function withTimeout<TResult>(
  promise: Promise<TResult>,
  ms: number,
  message: string
): Promise<TResult> {
  let timer: ReturnType<typeof setTimeout> | undefined

  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      reject(new Error(message))
    }, ms)
  })

  try {
    return await Promise.race([promise, timeout])
  } finally {
    clearTimeout(timer)
  }
}
