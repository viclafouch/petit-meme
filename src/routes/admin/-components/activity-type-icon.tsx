import type { ActivityEventType } from '~/db/generated/prisma/enums'
import { ACTIVITY_TYPE_DISPLAY } from '~/routes/admin/-helpers/activity'

type ActivityTypeIconProps = {
  type: ActivityEventType
  className?: string
}

export const ActivityTypeIcon = ({
  type,
  className
}: ActivityTypeIconProps) => {
  const Icon = ACTIVITY_TYPE_DISPLAY[type].icon

  return <Icon className={className} aria-hidden />
}
