import React from 'react'
import { LoaderCircleIcon } from 'lucide-react'
import { useSpinDelay } from 'spin-delay'
import { Button } from '~/components/ui/button'
import { m } from '~/paraglide/messages'

export const LoadingButton = ({
  children,
  disabled,
  loadingText = m.common_loading(),
  isLoading,
  ...props
}: React.ComponentProps<typeof Button> & {
  isLoading: boolean
  loadingText?: string
}) => {
  const showSpinner = useSpinDelay(isLoading, { delay: 500, minDuration: 200 })

  return (
    <Button {...props} disabled={disabled || isLoading} aria-busy={isLoading}>
      {showSpinner ? (
        <>
          <LoaderCircleIcon className="animate-spin" />
          {loadingText}
        </>
      ) : (
        children
      )}
    </Button>
  )
}
