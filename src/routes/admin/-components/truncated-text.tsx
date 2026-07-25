import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '~/components/ui/tooltip'
import { cn } from '~/lib/utils'

type TruncatedTextParams = {
  text: string
  className?: string
}

export const TruncatedText = ({ text, className }: TruncatedTextParams) => {
  return (
    <Tooltip>
      <TooltipTrigger
        className={cn(
          'block cursor-default truncate rounded-sm text-left text-sm',
          className
        )}
      >
        {text}
      </TooltipTrigger>
      <TooltipContent className="max-w-xs wrap-break-word">
        {text}
      </TooltipContent>
    </Tooltip>
  )
}
