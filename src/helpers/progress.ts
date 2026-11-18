const PROGRESS_STEPS = 100

export const createSteppedProgress = (
  onProgress: (progress: number) => void
) => {
  let lastStep = -1

  return (progress: number) => {
    const step = Math.floor(Math.min(1, progress) * PROGRESS_STEPS)

    if (step !== lastStep) {
      lastStep = step
      onProgress(step / PROGRESS_STEPS)
    }
  }
}
