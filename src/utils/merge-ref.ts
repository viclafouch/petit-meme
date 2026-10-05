export function mergeRefs<T>(
  ...refs: (React.RefObject<T> | React.Ref<T> | undefined)[]
): React.Ref<T> | null {
  const filteredRefs = refs.filter(Boolean)

  if (filteredRefs.length === 0) {
    return null
  }

  if (filteredRefs.length === 1) {
    return filteredRefs[0] as React.Ref<T>
  }

  return (inst: T) => {
    for (const ref of filteredRefs) {
      if (typeof ref === 'function') {
        ref(inst)
      } else if (ref) {
        ;(ref as React.RefObject<T>).current = inst
      }
    }
  }
}
