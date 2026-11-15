export const yieldToMain = () => {
  if ('scheduler' in globalThis && 'yield' in scheduler) {
    return scheduler.yield()
  }

  return new Promise<void>((resolve) => {
    setTimeout(resolve, 0)
  })
}

export const runInBackground = (task: () => Promise<void> | void) => {
  if ('scheduler' in globalThis && 'postTask' in scheduler) {
    void scheduler.postTask(task, { priority: 'background' })

    return
  }

  setTimeout(() => {
    void task()
  }, 0)
}
