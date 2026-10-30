import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '~/components/ui/tooltip'
import {
  DATE_WITH_TIME_OPTIONS,
  formatDate,
  formatRelativeTime
} from '~/helpers/date'
import { getLocale } from '~/paraglide/runtime'

type RelativeDateTooltipProps = {
  date: Date
  now: number
}

export const RelativeDateTooltip = ({
  date,
  now
}: RelativeDateTooltipProps) => {
  const locale = getLocale()

  return (
    <Tooltip>
      <TooltipTrigger render={<span className="text-sm cursor-default" />}>
        {formatRelativeTime(date, locale, now)}
      </TooltipTrigger>
      <TooltipContent>
        {formatDate(date, locale, DATE_WITH_TIME_OPTIONS)}
      </TooltipContent>
    </Tooltip>
  )
}
