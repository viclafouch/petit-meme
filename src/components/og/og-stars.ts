import { OG_IMAGE_HEIGHT, OG_IMAGE_WIDTH } from '~/constants/og'

const seededRandom = (seed: number) => {
  const x = Math.sin(seed) * 10_000

  return x - Math.floor(x)
}

type StarLayerParams = {
  count: number
  size: number
  seed: number
}

const generateStarShadows = ({ count, size, seed }: StarLayerParams) => {
  const spread = size > 1 ? '1px' : '0px'

  return Array.from({ length: count }, (_, index) => {
    const px = Math.floor(seededRandom(seed + index * 2) * OG_IMAGE_WIDTH)
    const py = Math.floor(seededRandom(seed + index * 2 + 1) * OG_IMAGE_HEIGHT)
    const opacity = 0.3 + seededRandom(seed + index * 3) * 0.7

    return `${px}px ${py}px 0px ${spread} rgba(255,255,255,${opacity.toFixed(2)})`
  }).join(', ')
}

export const STAR_SHADOWS = [
  generateStarShadows({ count: 80, size: 1, seed: 42 }),
  generateStarShadows({ count: 30, size: 2, seed: 137 })
].join(', ')
