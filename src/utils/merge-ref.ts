/** Merge multiple refs into a single one.
 *
 * Taken from https://www.davedrinks.coffee/how-do-i-use-two-react-refs/, type-hints by us
 */
export function mergeRefs<T>(
  ...refs: (React.RefObject<T> | React.Ref<T> | undefined)[]
): React.Ref<T> | null {
  const filteredRefs = refs.filter(Boolean)

  if (!filteredRefs.length) {
    return null
  }

  if (filteredRefs.length === 0) {
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
