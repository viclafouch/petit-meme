import { createFileRoute } from '@tanstack/react-router'
import { m } from '~/paraglide/messages.js'
import { SettingsPage } from './-components/settings-page'

export const Route = createFileRoute('/_public__root/_default/settings/')({
  component: SettingsPage,
  head: () => {
    return {
      meta: [
        { title: m.settings_page_title() },
        { name: 'robots', content: 'noindex,nofollow' }
      ]
    }
  }
})
