import React from 'react'

export const useActivationCount = (isActive: boolean) => {
  const [previousIsActive, setPreviousIsActive] = React.useState(isActive)
  const [activationCount, setActivationCount] = React.useState(0)

  if (previousIsActive !== isActive) {
    setPreviousIsActive(isActive)

    if (isActive) {
      setActivationCount((count) => {
        return count + 1
      })
    }
  }

  return activationCount
}
