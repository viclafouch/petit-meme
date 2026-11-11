import { z } from 'zod'
import { HTTP_STATUS } from '~/constants/http'
import { MEME_FILL_PATH } from '~/constants/meme-fill'
import type { Meme } from '~/db/generated/prisma/client'

const START_FAILURE_MESSAGE = 'AI Assist n’a pas pu démarrer'

const FILL_ERROR_SCHEMA = z.object({ message: z.string() })

export class MemeFillInFlightError extends Error {
  constructor(message: string) {
    super(message)

    Object.setPrototypeOf(this, new.target.prototype)

    this.name = 'MemeFillInFlightError'
  }
}

type MemeFillRequest = {
  memeId: Meme['id']
  customPrompt: string
}

export async function requestMemeFill(body: MemeFillRequest) {
  const response = await fetch(MEME_FILL_PATH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })

  if (response.ok) {
    return
  }

  const payload = FILL_ERROR_SCHEMA.safeParse(
    await response.json().catch(() => {
      return null
    })
  )

  const message = payload.success ? payload.data.message : START_FAILURE_MESSAGE

  if (response.status === HTTP_STATUS.CONFLICT) {
    throw new MemeFillInFlightError(message)
  }

  throw new Error(message)
}
