import type { VariantProps } from 'class-variance-authority'
import { z } from 'zod'
import type { badgeVariants } from '~/components/ui/badge'
import { TWEET_LINK_SCHEMA, YOUTUBE_LINK_SCHEMA } from '~/constants/url'
import {
  MemeContentLocale,
  MemeSubmissionUrlType,
  type MemeSubmissionStatus
} from '~/db/generated/prisma/enums'
import { m } from '~/paraglide/messages.js'

const detectUrlType = (url: string): MemeSubmissionUrlType | null => {
  if (TWEET_LINK_SCHEMA.safeParse(url).success) {
    return MemeSubmissionUrlType.TWEET
  }

  if (YOUTUBE_LINK_SCHEMA.safeParse(url).success) {
    return MemeSubmissionUrlType.YOUTUBE
  }

  return null
}

const SUBMISSION_TITLE_MIN_LENGTH = 3
const SUBMISSION_TITLE_MAX_LENGTH = 100

const SUBMISSION_TITLE_SCHEMA = z
  .string()
  .trim()
  .min(SUBMISSION_TITLE_MIN_LENGTH, {
    error: () => {
      return m.submit_error_title_too_short()
    }
  })
  .max(SUBMISSION_TITLE_MAX_LENGTH)

export const CREATE_MEME_SUBMISSION_SCHEMA = z
  .object({
    title: SUBMISSION_TITLE_SCHEMA,
    url: z.url({
      protocol: /^https$/u,
      error: () => {
        return m.submit_error_invalid_url()
      }
    }),
    contentLocale: z.enum(MemeContentLocale),
    acceptTerms: z.literal(true, {
      error: () => {
        return m.validation_accept_terms()
      }
    })
  })
  .transform((data, context) => {
    const urlType = detectUrlType(data.url)

    if (urlType === null) {
      context.addIssue({
        code: 'custom',
        message: m.submit_url_error(),
        path: ['url']
      })

      return z.NEVER
    }

    return {
      title: data.title,
      url: data.url,
      contentLocale: data.contentLocale,
      urlType
    }
  })

export const MAX_PENDING_SUBMISSIONS = 3

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>

export const SUBMISSION_STATUS_BADGE_VARIANT = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'destructive'
} as const satisfies Record<MemeSubmissionStatus, BadgeVariant>
