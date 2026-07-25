import { createHash } from 'node:crypto'
import { createServerOnlyFn } from '@tanstack/react-start'
import { serverEnv } from '~/env/server'
import { truncateToUtcDay } from '~/helpers/date'

const ISO_DAY_LENGTH = 'YYYY-MM-DD'.length

export const getVisitorKey = createServerOnlyFn(
  (ipAddress: string, date = new Date()) => {
    const utcDay = truncateToUtcDay(date).toISOString().slice(0, ISO_DAY_LENGTH)

    return createHash('sha256')
      .update(`${ipAddress}${utcDay}${serverEnv.VISITOR_KEY_SALT}`)
      .digest('hex')
  }
)
