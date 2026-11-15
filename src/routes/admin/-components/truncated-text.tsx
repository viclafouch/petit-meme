import React from 'react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '~/components/ui/tooltip'
import { cn } from '~/lib/utils'

type TruncatedTextProps = {
  text: string
  className?: string
}

const useIsTruncated = () => {
  const [isTruncated, setIsTruncated] = React.useState(false)

  const measureRef = React.useCallback((element: HTMLElement | null) => {
    if (element === null) {
      return
    }

    const observer = new ResizeObserver(() => {
      setIsTruncated(element.scrollWidth > element.clientWidth)
    })

    observer.observe(element)

    return () => {
      observer.disconnect()
    }
  }, [])

  return { isTruncated, measureRef }
}

export const TruncatedText = ({ text, className }: TruncatedTextProps) => {
  const { isTruncated, measureRef } = useIsTruncated()
  const textClassName = cn('block truncate text-left text-sm', className)

  if (!isTruncated) {
    return (
      <span key={text} ref={measureRef} className={textClassName}>
        {text}
      </span>
    )
  }

  return (
    <Tooltip>
      <TooltipTrigger
        key={text}
        ref={measureRef}
        className={cn('cursor-default rounded-sm', textClassName)}
      >
        {text}
      </TooltipTrigger>
      <TooltipContent aria-hidden className="max-w-xs wrap-break-word">
        {text}
      </TooltipContent>
    </Tooltip>
  )
}
