import { expect, type Page } from '@playwright/test'
import { HTTP_STATUS } from '~/constants/http'
import { MAX_PENDING_PROPOSALS } from '~/constants/meme-proposal'
import { FIVE_MINUTES_MS } from '~/constants/time'
import { prismaClient } from '~/db/client.server'
import type { MemeProposal } from '~/db/generated/prisma/client'
import { MemeProposalUrlType } from '~/db/generated/prisma/enums'
import { truncateUrl } from '~/helpers/format'
import { m } from '~/paraglide/messages'
import { getAuthDialogSignInButton } from './auth-flows'
import { E2E_ROLES } from './constants'
import { resolveStorageStatePath } from './env'
import { test } from './fixtures'
import { repeatUntilVisible } from './hydration'
import {
  cutServerFunctionCalls,
  holdServerFunctionCall,
  matchIsServerFunctionRequest,
  repeat,
  sendServerFunctionCallsAtOnce
} from './server-functions'

const SUBMIT_PATH = '/submit'

const PROPOSED_PROPOSAL = {
  title: 'Le chien qui fait du skateboard',
  url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
} as const satisfies Pick<MemeProposal, 'title' | 'url'>

const UNSUPPORTED_PROPOSAL_URL = 'https://vimeo.com/76979871'

const CONCURRENT_PROPOSAL_URLS = [
  'https://www.youtube.com/watch?v=e2eConcur01',
  'https://www.youtube.com/watch?v=e2eConcur02',
  'https://www.youtube.com/watch?v=e2eConcur03',
  'https://www.youtube.com/watch?v=e2eConcur04',
  'https://www.youtube.com/watch?v=e2eConcur05'
] as const satisfies readonly MemeProposal['url'][]

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
  await getTitleField(page).fill(PROPOSED_PROPOSAL.title)
  await getLinkField(page).fill(url)
  await getSubmitButton(page).click()
}

const expectNothingProposedYet = async (page: Page) => {
  await expect(
    page.getByRole('heading', { level: 1, name: m.submit_heading() })
  ).toBeVisible()
  await expect(getRemainingCount(page, MAX_PENDING_PROPOSALS)).toBeVisible()
  await expect(getHistoryHeading(page)).toBeHidden()
}

const expectHistoryToHoldTheProposal = async (page: Page) => {
  await expect(getHistoryHeading(page)).toBeVisible()
  await expect(
    page.getByText(PROPOSED_PROPOSAL.title, { exact: true })
  ).toBeVisible()
  await expect(getHistoryStatus(page)).toHaveText(m.submit_status_pending())
  await expect(
    page.getByRole('link', { name: truncateUrl(PROPOSED_PROPOSAL.url) })
  ).toHaveAttribute('href', PROPOSED_PROPOSAL.url)
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
  test.use({ storageState: resolveStorageStatePath('proposal') })

  test('proposes a link and finds it in their history, even after a reload', async ({
    page
  }) => {
    await page.goto(SUBMIT_PATH)

    await expectNothingProposedYet(page)

    await proposeLink(page, PROPOSED_PROPOSAL.url)

    await expect(getSuccessToast(page)).toBeVisible()
    await expectHistoryToHoldTheProposal(page)

    await expect(
      getRemainingCount(page, MAX_PENDING_PROPOSALS - 1)
    ).toBeVisible()
    await expect(getTitleField(page)).toHaveValue('')

    expect(
      await prismaClient.memeProposal.findFirst({
        where: { userId: E2E_ROLES.proposal.id },
        select: { url: true, urlType: true }
      })
    ).toStrictEqual({
      url: PROPOSED_PROPOSAL.url,
      urlType: MemeProposalUrlType.YOUTUBE
    })

    await page.clock.setFixedTime(Date.now() + FIVE_MINUTES_MS)
    await page.reload()

    await expectHistoryToHoldTheProposal(page)
  })
})

test.describe('a User who proposes several links at once', () => {
  test.use({ storageState: resolveStorageStatePath('proposalConcurrent') })

  test('gets as many pending proposals as the cap allows', async ({ page }) => {
    const [interceptedUrl] = CONCURRENT_PROPOSAL_URLS
    await page.goto(SUBMIT_PATH)
    await expectNothingProposedYet(page)

    const call = await holdServerFunctionCall(page, () => {
      return proposeLink(page, interceptedUrl)
    })
    const statuses = await sendServerFunctionCallsAtOnce({
      page,
      call,
      bodies: CONCURRENT_PROPOSAL_URLS.map((url) => {
        return call.body.replaceAll(interceptedUrl, url)
      }),
      clientIp: 'e2e-proposal-concurrent'
    })

    expect(statuses).toStrictEqual([
      ...repeat(HTTP_STATUS.OK, MAX_PENDING_PROPOSALS),
      ...repeat(
        HTTP_STATUS.UNPROCESSABLE_CONTENT,
        CONCURRENT_PROPOSAL_URLS.length - MAX_PENDING_PROPOSALS
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

    await proposeLink(page, UNSUPPORTED_PROPOSAL_URL)

    await expect(page.getByText(m.submit_url_error())).toBeVisible()
    await expectProposalKeptFromTheServer(page, serverFunctionCalls)

    await getLinkField(page).fill(PROPOSED_PROPOSAL.url)
    await getTermsCheckbox(page).uncheck()
    await getSubmitButton(page).click()

    await expect(page.getByText(m.validation_accept_terms())).toBeVisible()
    await expectProposalKeptFromTheServer(page, serverFunctionCalls)
  })
})

test.describe('a User whose proposal never reaches the server', () => {
  test.use({ storageState: resolveStorageStatePath('free') })

  test('is shown an error and can try again', async ({ page }) => {
    await page.goto(SUBMIT_PATH)
    await cutServerFunctionCalls(page)
    const failedProposal = page.waitForEvent(
      'requestfailed',
      matchIsServerFunctionRequest
    )

    await proposeLink(page, PROPOSED_PROPOSAL.url)

    await failedProposal
    await expect(getPageMain(page).getByRole('alert')).toBeVisible()
    await expect(getSubmitButton(page)).toBeEnabled()
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
