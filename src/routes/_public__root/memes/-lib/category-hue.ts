const HUE_STEPS = 360
const HUE_SEED = 7
const HUE_MULTIPLIER = 31

export const getCategoryHue = (slug: string) => {
  let hue = HUE_SEED

  for (let index = 0; index < slug.length; index += 1) {
    hue = (hue * HUE_MULTIPLIER + slug.charCodeAt(index)) % HUE_STEPS
  }

  return hue
}
