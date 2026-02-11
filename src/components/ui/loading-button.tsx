import React from 'react'
import { Loader2Icon } from 'lucide-react'
import { useSpinDelay } from 'spin-delay'
import { Button } from '@/components/ui/button'

export const LoadingButton = ({
  children,
  disabled,
  loadingText = 'Chargement...',
  isLoading,
  ...props
}: React.ComponentProps<typeof Button> & {
  isLoading: boolean
  loadingText?: string
}) => {
  const showSpinner = useSpinDelay(isLoading, { delay: 500, minDuration: 200 })

  return (
    <Button {...props} disabled={disabled || isLoading}>
      {showSpinner ? (
        <>
          <Loader2Icon className="animate-spin" />
          {loadingText}
        </>
      ) : (
        children
      )}
    </Button>
  )
}
