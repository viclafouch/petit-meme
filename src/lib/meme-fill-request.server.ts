import { z } from 'zod'
import { HTTP_STATUS } from '~/constants/http'
import { MEME_FILL_CUSTOM_PROMPT_MAX_LENGTH } from '~/constants/meme-fill'
import { auth } from '~/lib/auth.server'
import { adminLogger, authLogger } from '~/lib/logger'
import { startMemeFill } from '~/lib/meme-draft-fill.server'
import { captureWithFeature } from '~/lib/sentry'

const MEME_FILL_REQUEST_SCHEMA = z.object({
  memeId: z.string().min(1),
  customPrompt: z.string().max(MEME_FILL_CUSTOM_PROMPT_MAX_LENGTH)
})

async function findAdminUser(headers: Headers) {
  const session = await auth.api.getSession({
    headers,
    query: { disableCookieCache: true }
  })

  if (session?.user.role !== 'admin' || session.user.banned === true) {
    return null
  }

  return session.user
}

async function readMemeFillRequest(request: Request) {
  try {
    return MEME_FILL_REQUEST_SCHEMA.safeParse(await request.json())
  } catch {
    return null
  }
}

export async function handleMemeFillRequest(request: Request) {
  const admin = await findAdminUser(request.headers)

  if (!admin) {
    authLogger.warn('Meme fill rejected: no admin session')

    return Response.json(
      { message: 'Accès refusé' },
      { status: HTTP_STATUS.UNAUTHORIZED }
    )
  }

  const body = await readMemeFillRequest(request)

  if (!body?.success) {
    return Response.json(
      { message: 'Requête invalide' },
      { status: HTTP_STATUS.BAD_REQUEST }
    )
  }

  try {
    const isStarted = await startMemeFill(body.data)

    if (!isStarted) {
      return Response.json(
        { message: 'AI Assist tourne déjà sur ce mème' },
        { status: HTTP_STATUS.CONFLICT }
      )
    }

    adminLogger.info(
      { memeId: body.data.memeId, adminId: admin.id },
      'AI Assist started'
    )

    return Response.json({ success: true })
  } catch (error) {
    adminLogger.error(
      { error, memeId: body.data.memeId },
      'AI Assist failed to start'
    )
    captureWithFeature(error, 'meme-draft-fill')

    return Response.json(
      { message: 'AI Assist n’a pas pu démarrer' },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    )
  }
}
