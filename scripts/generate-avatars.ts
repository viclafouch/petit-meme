/* oxlint-disable no-console */
import fs from 'node:fs/promises'
import path from 'node:path'
import { Avatar, Style } from '@dicebear/core'
import {
  AVATAR_BACKGROUND_PALETTE,
  AVATAR_CATALOG,
  AVATAR_DIRECTORY,
  AVATAR_STYLE_ID
} from '~/constants/avatar'

const STYLE_DEFINITION_SPECIFIER = `@dicebear/styles/${AVATAR_STYLE_ID}.json`

const STYLE_LICENSE =
  'Remix of „Adventurer Neutral” (https://www.figma.com/community/file/1184595184137881796) by „Lisa Wischofsky”, licensed under „CC BY 4.0” (https://creativecommons.org/licenses/by/4.0/)'

const OUTPUT_DIRECTORY = path.resolve(`public${AVATAR_DIRECTORY}`)

const loadStyle = async () => {
  const definitionUrl = new URL(import.meta.resolve(STYLE_DEFINITION_SPECIFIER))
  const definition: unknown = JSON.parse(
    await fs.readFile(definitionUrl, 'utf8')
  )

  return new Style(definition)
}

const writeCatalogAvatars = async () => {
  const style = await loadStyle()

  await fs.mkdir(OUTPUT_DIRECTORY, { recursive: true })

  await Promise.all(
    AVATAR_CATALOG.map(async ({ id, seed }) => {
      const avatar = new Avatar(style, {
        seed,
        backgroundColor: AVATAR_BACKGROUND_PALETTE
      })

      await fs.writeFile(
        path.join(OUTPUT_DIRECTORY, `${id}.svg`),
        avatar.toString()
      )
    })
  )

  console.log(
    `${AVATAR_CATALOG.length} avatars écrits dans ${OUTPUT_DIRECTORY}`
  )
  console.log(`Style : ${AVATAR_STYLE_ID}`)
  console.log(`Palette : ${AVATAR_BACKGROUND_PALETTE.join(' ')}`)
  console.log(`Licence : ${STYLE_LICENSE}`)
}

void writeCatalogAvatars()
