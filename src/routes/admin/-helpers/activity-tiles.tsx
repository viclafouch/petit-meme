import { ActivityEventType } from '~/db/generated/prisma/enums'
import { ActivityTypeIcon } from '~/routes/admin/-components/activity-type-icon'
import type { StatTileEntry } from '~/routes/admin/-components/stat-tiles'
import { ACTIVITY_TYPE_DISPLAY } from '~/routes/admin/-helpers/activity'
import type { ActivityTotals } from '~/routes/admin/-server/activity'

const ACTIVITY_TILE_TYPES = [
  ActivityEventType.VIEW,
  ActivityEventType.DOWNLOAD,
  ActivityEventType.SHARE,
  ActivityEventType.GENERATION
] as const satisfies readonly ActivityEventType[]

export function buildActivityTiles(totals: ActivityTotals) {
  return ACTIVITY_TILE_TYPES.map((type) => {
    return {
      key: type,
      label: ACTIVITY_TYPE_DISPLAY[type].pluralLabel,
      value: totals[type],
      icon: <ActivityTypeIcon type={type} className="size-4" />
    }
  }) satisfies StatTileEntry[]
}
