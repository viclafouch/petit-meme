import React from 'react'

export const lazyComponent = <TProps extends object>(
  loadComponent: () => Promise<React.ComponentType<TProps>>
) => {
  return React.lazy(async () => {
    return { default: await loadComponent() }
  })
}
