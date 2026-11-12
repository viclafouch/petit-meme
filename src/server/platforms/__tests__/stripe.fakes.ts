import { Stripe } from 'stripe'
import { HTTP_STATUS } from '~/constants/http'
import { STRIPE_API_VERSION } from '~/constants/stripe'

export type FakeStripeRequest = { route: string; body: URLSearchParams }

export type FakeStripeFailure = { status: number; type: string; code: string }

type CreateFakeStripeClientParams = {
  responses: Record<string, object>
  failures?: Record<string, FakeStripeFailure>
}

const toStripeRoute = (input: string | URL | Request, init?: RequestInit) => {
  const { pathname } = new URL(input instanceof Request ? input.url : input)

  return `${init?.method ?? 'GET'} ${pathname}`
}

export const createFakeStripeClient = ({
  responses,
  failures = {}
}: CreateFakeStripeClientParams) => {
  const stripeRequests: FakeStripeRequest[] = []

  const respondLikeStripe = async (
    input: string | URL | Request,
    init?: RequestInit
  ) => {
    const route = toStripeRoute(input, init)

    stripeRequests.push({
      route,
      body: new URLSearchParams(typeof init?.body === 'string' ? init.body : '')
    })

    const failure = failures[route]

    if (failure) {
      return Response.json(
        {
          error: {
            type: failure.type,
            code: failure.code,
            message: `Fake failure for ${route}`
          }
        },
        { status: failure.status }
      )
    }

    const response = responses[route]

    if (!response) {
      return Response.json(
        { error: { message: `No fake for ${route}` } },
        { status: HTTP_STATUS.NOT_FOUND }
      )
    }

    return Response.json(response)
  }

  const stripeClient = new Stripe('sk_test_fake', {
    apiVersion: STRIPE_API_VERSION,
    maxNetworkRetries: 0,
    httpClient: Stripe.createFetchHttpClient(respondLikeStripe)
  })

  return { stripeClient, stripeRequests }
}
