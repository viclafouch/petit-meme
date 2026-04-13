const seededRandom = (seed: number) => {
  const x = Math.sin(seed) * 10_000

  return x - Math.floor(x)
}

const generateStarShadows = (count: number, size: number, seed: number) => {
  const shadows: string[] = []

  for (let index = 0; index < count; index += 1) {
    const px = Math.floor(seededRandom(seed + index * 2) * 1200)
    const py = Math.floor(seededRandom(seed + index * 2 + 1) * 630)
    const opacity = 0.3 + seededRandom(seed + index * 3) * 0.7
    shadows.push(
      `${px}px ${py}px 0px ${size > 1 ? '1px' : '0px'} rgba(255,255,255,${opacity.toFixed(2)})`
    )
  }

  return shadows.join(', ')
}

export const STAR_SHADOWS = [
  generateStarShadows(80, 1, 42),
  generateStarShadows(30, 2, 137)
].join(', ')
