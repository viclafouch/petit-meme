import { useMatchRoute } from '@tanstack/react-router'

export const useIsLibraryActive = () => {
  const matchRoute = useMatchRoute()

  return Boolean(matchRoute({ to: '/memes', fuzzy: true }))
}
