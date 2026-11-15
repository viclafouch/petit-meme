import type { AnyRouter } from '@tanstack/react-router'

const matchIsViewTransitionNameTaken = (name: string) => {
  return [
    ...document.querySelectorAll<HTMLElement>('[style*="view-transition-name"]')
  ].some((element) => {
    return element.style.viewTransitionName === name
  })
}

export const nameViewTransitionUntilResolved = (
  element: HTMLElement,
  name: string,
  router: AnyRouter
) => {
  if (matchIsViewTransitionNameTaken(name)) {
    return
  }

  element.style.viewTransitionName = name

  const unsubscribe = router.subscribe('onResolved', () => {
    element.style.removeProperty('view-transition-name')
    unsubscribe()
  })
}
