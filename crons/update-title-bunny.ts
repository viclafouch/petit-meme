/* eslint-disable no-console */
/* eslint-disable no-await-in-loop */
import { z } from 'zod'
import { prismaClient } from '@/db'
import { clientEnv } from '@/env/client'
import { getBunnyHeaders } from '@/lib/bunny'
import { fetchWithZod } from '@/lib/utils'

/*
  On admin, when we update the title of a meme, we don't update the title on bunny.net.
  This script is used to update the title on bunny.net.
*/

export const updateVideoTitle = async (videoId: string, title: string) => {
  return fetchWithZod(
    z.object({ success: z.literal(true) }),
    `https://video.bunnycdn.com/library/${clientEnv.VITE_BUNNY_LIBRARY_ID}/videos/${videoId}`,
    {
      method: 'POST',
      headers: getBunnyHeaders(),
      body: JSON.stringify({ title })
    }
  )
}

const task = async () => {
  const memes = await prismaClient.meme.findMany({
    include: {
      video: true
    }
  })

  console.log('Found memes', memes.length)

  for (const meme of memes) {
    const { bunnyId } = meme.video

    await updateVideoTitle(bunnyId, meme.title)

    await new Promise((resolve) => {
      setTimeout(resolve, 250)
    })

    console.log('Updated meme title on bunny.net', meme.title)
  }

  process.exit(0)
}

void task()
