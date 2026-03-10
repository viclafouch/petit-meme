import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/components/ui/tooltip'
import {
  DATE_WITH_TIME_OPTIONS,
  formatDate,
  formatRelativeTime
} from '@/helpers/date'
import { getLocale } from '@/paraglide/runtime'

type RelativeDateTooltipParams = {
  date: Date
}

export const RelativeDateTooltip = ({ date }: RelativeDateTooltipParams) => {
  const locale = getLocale()

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="text-sm cursor-default">
          {formatRelativeTime(date, locale)}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        {formatDate(date, locale, DATE_WITH_TIME_OPTIONS)}
      </TooltipContent>
    </Tooltip>
  )
}
