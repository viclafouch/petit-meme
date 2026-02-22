export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message: string
) {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(message))
    }, ms)
  })

  return Promise.race([promise, timeout])
}
