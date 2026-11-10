const PROMPT_SLOT_PATTERN = /\{\{(\w+)\}\}/gu

export function fillPromptTemplate(
  template: string,
  values: Record<string, string>
) {
  const filledSlots = new Set<string>()
  const prompt = template.replaceAll(
    PROMPT_SLOT_PATTERN,
    (_slot, slotName: string) => {
      const value = values[slotName]

      if (value === undefined) {
        throw new Error(`The prompt has no value for {{${slotName}}}`)
      }

      filledSlots.add(slotName)

      return value
    }
  )
  const unusedSlots = Object.keys(values).filter((slotName) => {
    return !filledSlots.has(slotName)
  })

  if (unusedSlots.length > 0) {
    throw new Error(`The prompt has no slot for ${unusedSlots.join(', ')}`)
  }

  return prompt.trim()
}
