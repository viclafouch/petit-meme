import { z } from 'zod'
import { prismaClient } from '@/db'
import { auth } from '@/lib/auth'
import { locales } from '@/paraglide/runtime'
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'

const LOCALE_SCHEMA = z.object({ locale: z.enum(locales) })

export const updateUserLocale = createServerFn({ method: 'POST' })
  .inputValidator((data) => {
    return LOCALE_SCHEMA.parse(data)
  })
  .handler(async ({ data }) => {
    const { headers } = getRequest()
    const session = await auth.api.getSession({ headers })

    if (!session?.user) {
      return
    }

    await prismaClient.user.update({
      where: { id: session.user.id },
      data: { locale: data.locale }
    })
  })
