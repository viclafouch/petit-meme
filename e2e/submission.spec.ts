import { expect, type Page } from '@playwright/test'
import { prismaClient } from '~/db'
import { HTTP_STATUS } from '~/constants/http'
import { MAX_PENDING_SUBMISSIONS } from '~/constants/meme-submission'
import type { MemeSubmission } from '~/db/generated/prisma/client'
import { MemeSubmissionUrlType } from '~/db/generated/prisma/enums'
import { truncateUrl } from '~/helpers/format'
import { m } from '~/paraglide/messages.js'
import { getAuthDialogSignInButton } from './auth-flows'
import { E2E_ROLES } from './constants'
import { resolveStorageStatePath } from './env'
import { test } from './fixtures'
import { repeatUntilVisible } from './hydration'
import {
  holdServerFunctionCall,
  matchIsServerFunctionRequest,
  repeat,
  sendServerFunctionCallsAtOnce
} from './server-functions'

const SUBMIT_PATH = '/submit'

const PROPOSED_SUBMISSION = {
  title: 'Le chien qui fait du skateboard',
  url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
} as const satisfies Pick<MemeSubmission, 'title' | 'url'>

const UNSUPPORTED_SUBMISSION_URL = 'https://vimeo.com/76979871'

const CONCURRENT_SUBMISSION_URLS = [
  'https://www.youtube.com/watch?v=e2eConcur01',
  'https://www.youtube.com/watch?v=e2eConcur02',
  'https://www.youtube.com/watch?v=e2eConcur03',
  'https://www.youtube.com/watch?v=e2eConcur04',
  'https://www.youtube.com/watch?v=e2eConcur05'
] as const satisfies readonly MemeSubmission['url'][]

const getPageMain = (page: Page) => {
  return page.getByRole('main')
}

const getTitleField = (page: Page) => {
  return getPageMain(page).getByLabel(m.submit_field_title())
}

const getLinkField = (page: Page) => {
  return getPageMain(page).getByLabel(m.submit_field_link())
}

const getTermsCheckbox = (page: Page) => {
  return getPageMain(page).getByRole('checkbox')
}

const getAcceptedTermsCheckbox = (page: Page) => {
  return getPageMain(page).getByRole('checkbox', { checked: true })
}

const getSubmitButton = (page: Page) => {
  return getPageMain(page).getByRole('button', {
    name: m.submit_submit_button()
  })
}

const getHistoryHeading = (page: Page) => {
  return page.getByRole('heading', { name: m.submit_history_heading() })
}

const getHistoryStatus = (page: Page) => {
  return getPageMain(page).getByRole('status')
}

const getSuccessToast = (page: Page) => {
  return page.getByText(m.submit_success_toast())
}

const getRemainingCount = (page: Page, remaining: number) => {
  return getPageMain(page).getByText(m.submit_pending_count({ remaining }), {
    exact: true
  })
}

const acceptTerms = async (page: Page) => {
  await repeatUntilVisible(async () => {
    if (await getTermsCheckbox(page).isChecked()) {
      return
    }

    await getTermsCheckbox(page).click()
  }, getAcceptedTermsCheckbox(page))
}

const proposeLink = async (page: Page, url: string) => {
  await acceptTerms(page)
  await getTitleField(page).fill(PROPOSED_SUBMISSION.title)
  await getLinkField(page).fill(url)
  await getSubmitButton(page).click()
}

const expectNothingProposedYet = async (page: Page) => {
  await expect(
    page.getByRole('heading', { level: 1, name: m.submit_heading() })
  ).toBeVisible()
  await expect(getRemainingCount(page, MAX_PENDING_SUBMISSIONS)).toBeVisible()
  await expect(getHistoryHeading(page)).toBeHidden()
}

const expectHistoryToHoldTheProposal = async (page: Page) => {
  await expect(getHistoryHeading(page)).toBeVisible()
  await expect(
    page.getByText(PROPOSED_SUBMISSION.title, { exact: true })
  ).toBeVisible()
  await expect(getHistoryStatus(page)).toHaveText(m.submit_status_pending())
  await expect(
    page.getByRole('link', { name: truncateUrl(PROPOSED_SUBMISSION.url) })
  ).toHaveAttribute('href', PROPOSED_SUBMISSION.url)
}

const expectProposalKeptFromTheServer = async (
  page: Page,
  serverFunctionCalls: string[]
) => {
  await expect(getHistoryHeading(page)).toBeHidden()
  expect(serverFunctionCalls).toStrictEqual([])
}

const recordServerFunctionCalls = (page: Page) => {
  const calls: string[] = []

  page.on('request', (request) => {
    if (matchIsServerFunctionRequest(request)) {
      calls.push(request.url())
    }
  })

  return calls
}

test.describe('a User with nothing proposed yet', () => {
  test.use({ storageState: resolveStorageStatePath('submission') })

  test('proposes a link and finds it in their history', async ({ page }) => {
    await page.goto(SUBMIT_PATH)

    await expectNothingProposedYet(page)

    await proposeLink(page, PROPOSED_SUBMISSION.url)

    await expect(getSuccessToast(page)).toBeVisible()
    await expectHistoryToHoldTheProposal(page)

    await expect(
      getRemainingCount(page, MAX_PENDING_SUBMISSIONS - 1)
    ).toBeVisible()
    await expect(getTitleField(page)).toHaveValue('')

    expect(
      await prismaClient.memeSubmission.findFirst({
        where: { userId: E2E_ROLES.submission.id },
        select: { url: true, urlType: true }
      })
    ).toStrictEqual({
      url: PROPOSED_SUBMISSION.url,
      urlType: MemeSubmissionUrlType.YOUTUBE
    })
  })
})

test.describe('a User who proposes several links at once', () => {
  test.describe.configure({ retries: 0 })
  test.use({ storageState: resolveStorageStatePath('submissionConcurrent') })

  test('gets as many pending proposals as the cap allows', async ({ page }) => {
    const [interceptedUrl] = CONCURRENT_SUBMISSION_URLS
    await page.goto(SUBMIT_PATH)
    await expectNothingProposedYet(page)

    const call = await holdServerFunctionCall(page, () => {
      return proposeLink(page, interceptedUrl)
    })
    const statuses = await sendServerFunctionCallsAtOnce({
      page,
      call,
      bodies: CONCURRENT_SUBMISSION_URLS.map((url) => {
        return call.body.replaceAll(interceptedUrl, url)
      }),
      clientIp: 'e2e-submission-concurrent'
    })

    expect(statuses).toStrictEqual([
      ...repeat(HTTP_STATUS.OK, MAX_PENDING_SUBMISSIONS),
      ...repeat(
        HTTP_STATUS.UNPROCESSABLE_CONTENT,
        CONCURRENT_SUBMISSION_URLS.length - MAX_PENDING_SUBMISSIONS
      )
    ])
  })
})

test.describe('a User whose link is neither a tweet nor a YouTube video', () => {
  test.use({ storageState: resolveStorageStatePath('free') })

  test('is refused on the link, then on the terms, and never reaches the server', async ({
    page
  }) => {
    await page.goto(SUBMIT_PATH)

    const serverFunctionCalls = recordServerFunctionCalls(page)

    await proposeLink(page, UNSUPPORTED_SUBMISSION_URL)

    await expect(page.getByText(m.submit_url_error())).toBeVisible()
    await expectProposalKeptFromTheServer(page, serverFunctionCalls)

    await getLinkField(page).fill(PROPOSED_SUBMISSION.url)
    await getTermsCheckbox(page).uncheck()
    await getSubmitButton(page).click()

    await expect(page.getByText(m.validation_accept_terms())).toBeVisible()
    await expectProposalKeptFromTheServer(page, serverFunctionCalls)
  })
})

test.describe('an anonymous Visitor', () => {
  test('is offered sign in rather than a form', async ({ page }) => {
    await page.goto(SUBMIT_PATH)

    await expect(page.getByText(m.submit_login_description())).toBeVisible()
    await expect(getTitleField(page)).toBeHidden()

    await repeatUntilVisible(() => {
      return page.getByRole('button', { name: m.submit_login_cta() }).click()
    }, page.getByRole('dialog'))

    await expect(getAuthDialogSignInButton(page)).toBeVisible()
  })
})
