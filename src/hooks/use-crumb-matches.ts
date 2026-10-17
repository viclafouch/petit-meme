import { isMatch, useMatches } from '@tanstack/react-router'

export const useCrumbMatches = () => {
  const matches = useMatches()

  const isPending = matches.some((match) => {
    return match.status === 'pending'
  })

  if (isPending) {
    return []
  }

  return matches.filter((match) => {
    return isMatch(match, 'loaderData.crumb')
  })
}
