import { RuleTester } from 'oxlint/plugins-dev'
import { describe, it } from 'vitest'
import { noLinkAsButton } from '../plugin'

// oxlint-disable-next-line typescript/strict-void-return -- the oxlint RuleTester docs assign the vitest describe as is
RuleTester.describe = describe
RuleTester.it = it

const ruleTester = new RuleTester({
  languageOptions: { parserOptions: { lang: 'tsx' } }
})

ruleTester.run('no-link-as-button', noLinkAsButton, {
  valid: [
    {
      name: 'a link styled as a button',
      code: 'const App = () => <Link to="/settings" className={buttonVariants()}>Settings</Link>'
    },
    {
      name: 'a menu link item that renders a link',
      code: 'const App = () => <DropdownMenuLinkItem render={<Link to="/settings" />}>Settings</DropdownMenuLinkItem>'
    },
    {
      name: 'a native button',
      code: 'const App = () => <DrawerClose render={<Button variant="ghost" />}>Cancel</DrawerClose>'
    },
    {
      name: 'a non-native button that renders a span',
      code: 'const App = () => <Button nativeButton={false} render={<span />}>Play</Button>'
    },
    {
      name: 'a native button that renders a link',
      code: 'const App = () => <Button nativeButton render={<Link to="/" />}>Home</Button>'
    }
  ],
  invalid: [
    {
      name: 'a drawer close that renders a router link',
      code: 'const App = () => <DrawerClose nativeButton={false} render={<Link to="/settings" />}>Settings</DrawerClose>',
      errors: [{ messageId: 'linkAsButton', data: { element: 'Link' } }]
    },
    {
      name: 'a button that renders an anchor',
      code: 'const App = () => <Button render={<a href="/terms" />} nativeButton={false}>Terms</Button>',
      errors: [{ messageId: 'linkAsButton', data: { element: 'a' } }]
    }
  ]
})
