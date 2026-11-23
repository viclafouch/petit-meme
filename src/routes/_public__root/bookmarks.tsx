import { createFileRoute, redirect } from '@tanstack/react-router'
import { HTTP_STATUS } from '~/constants/http'

const LEGACY_BOOKMARKS_SUNSET = new Date('2027-05-23T00:00:00Z')

export const Route = createFileRoute('/_public__root/bookmarks')({
  beforeLoad: () => {
    throw redirect({
      to: '/memes/bookmarks',
      replace: true,
      statusCode: HTTP_STATUS.PERMANENT_REDIRECT,
      headers: { Sunset: LEGACY_BOOKMARKS_SUNSET.toUTCString() }
    })
  }
})
