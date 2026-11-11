type MergeableRef<TElement> = React.Ref<TElement> | undefined

export function mergeRefs<TElement>(
  ...refs: MergeableRef<TElement>[]
): React.Ref<TElement> | null {
  const filteredRefs = refs.filter((ref) => {
    return ref !== null && ref !== undefined
  })

  if (filteredRefs.length === 0) {
    return null
  }

  if (filteredRefs.length === 1) {
    return filteredRefs[0] ?? null
  }

  return (instance: TElement) => {
    for (const ref of filteredRefs) {
      if (typeof ref === 'function') {
        ref(instance)
      } else {
        ref.current = instance
      }
    }
  }
}
