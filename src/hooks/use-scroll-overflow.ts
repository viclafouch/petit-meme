import React from 'react'

export const useScrollOverflow = (
  scrollerRef: React.RefObject<HTMLElement | null>,
  listRef: React.RefObject<HTMLElement | null>
) => {
  const [hasMoreStart, setHasMoreStart] = React.useState(false)
  const [hasMoreEnd, setHasMoreEnd] = React.useState(false)

  React.useEffect(() => {
    const scroller = scrollerRef.current
    const list = listRef.current

    if (!scroller || !list) {
      return
    }

    const edgeObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const isCut = entry.intersectionRatio < 1

          if (entry.target === list.firstElementChild) {
            setHasMoreStart(isCut)
          }

          if (entry.target === list.lastElementChild) {
            setHasMoreEnd(isCut)
          }
        }
      },
      { root: scroller, threshold: 1, rootMargin: '1px' }
    )

    const observeEdges = () => {
      edgeObserver.disconnect()

      if (list.firstElementChild && list.lastElementChild) {
        edgeObserver.observe(list.firstElementChild)
        edgeObserver.observe(list.lastElementChild)
      }
    }

    const listObserver = new MutationObserver(observeEdges)

    observeEdges()
    listObserver.observe(list, { childList: true })

    return () => {
      listObserver.disconnect()
      edgeObserver.disconnect()
    }
  }, [scrollerRef, listRef])

  return { hasMoreStart, hasMoreEnd }
}
