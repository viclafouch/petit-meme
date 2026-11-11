import { afterEach, describe, expect, it } from 'vitest'
import { CREATE_MEME_SUBMISSION_SCHEMA } from '~/constants/meme-submission'
import { MemeContentLocale } from '~/db/generated/prisma/enums'
import { m } from '~/paraglide/messages.js'
import {
  getLocale,
  type Locale,
  locales,
  overwriteGetLocale
} from '~/paraglide/runtime'

const initialGetLocale = getLocale

const VALID_SUBMISSION = {
  title: 'A valid title',
  url: 'https://x.com/petitmeme/status/1234567890',
  contentLocale: MemeContentLocale.FR,
  acceptTerms: true
}

const INVALID_SUBMISSION = {
  title: 'a',
  url: 'http://example.com',
  contentLocale: MemeContentLocale.FR,
  acceptTerms: false
}

const UNSUPPORTED_URL_SUBMISSION = {
  title: 'A valid title',
  url: 'https://example.com',
  contentLocale: MemeContentLocale.FR,
  acceptTerms: true
}

const parseIssueMessagesIn = (locale: Locale, submission: object) => {
  overwriteGetLocale(() => {
    return locale
  })

  const result = CREATE_MEME_SUBMISSION_SCHEMA.safeParse(submission)

  return Object.fromEntries(
    (result.error?.issues ?? []).map((issue) => {
      return [issue.path.join('.'), issue.message]
    })
  )
}

describe('the meme submission schema', () => {
  afterEach(() => {
    overwriteGetLocale(initialGetLocale)
  })

  it('should accept a tweet link', () => {
    const result = CREATE_MEME_SUBMISSION_SCHEMA.safeParse(VALID_SUBMISSION)

    expect(result.data?.urlType).toBe('TWEET')
  })

  it.each(locales)('should name each invalid field in %s', (locale) => {
    const messages = parseIssueMessagesIn(locale, INVALID_SUBMISSION)

    expect(messages).toStrictEqual({
      title: m.submit_error_title_too_short({}, { locale }),
      url: m.submit_error_invalid_url({}, { locale }),
      acceptTerms: m.validation_accept_terms({}, { locale })
    })
  })

  it.each(locales)('should reject an unsupported link in %s', (locale) => {
    const messages = parseIssueMessagesIn(locale, UNSUPPORTED_URL_SUBMISSION)

    expect(messages).toStrictEqual({
      url: m.submit_url_error({}, { locale })
    })
  })
})
