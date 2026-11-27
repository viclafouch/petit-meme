import { useHotkey } from '@tanstack/react-hotkeys'
import { m } from '~/paraglide/messages'

type NavbarSearchHotkeysProps = {
  onFocusSearch: () => void
}

export const NavbarSearchHotkeys = ({
  onFocusSearch
}: NavbarSearchHotkeysProps) => {
  useHotkey('/', onFocusSearch, { meta: { name: m.search_label() } })
  useHotkey('Mod+K', onFocusSearch, { meta: { name: m.search_label() } })

  return null
}
