import React from 'react'
import {
  CircleUser,
  CreditCard,
  LogOut,
  MonitorDown,
  Plus,
  Settings,
  Shield,
  SparklesIcon,
  Star
} from 'lucide-react'
import { Drawer as DrawerPrimitive } from '@base-ui/react/drawer'
import { useQuery } from '@tanstack/react-query'
import {
  type LinkOptions,
  Link,
  useMatchRoute,
  useRouteContext
} from '@tanstack/react-router'
import { useSelector } from '@tanstack/react-store'
import { ThemeSwitcher } from '~/components/animate-ui/theme-switcher'
import { useSignOut } from '~/components/auth/use-sign-out'
import { FLAG_ICON_CLASS, LOCALE_FLAGS } from '~/components/icon/flags'
import { useInstallApp } from '~/components/install/use-install-app'
import { TAB_ITEM_CLASS } from '~/components/layout/tab-bar/tab-item-class'
import { useIsPremium } from '~/components/premium/use-is-premium'
import { useStripeCheckout } from '~/components/premium/use-stripe-checkout'
import { buttonVariants } from '~/components/ui/button'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerTitle,
  DrawerTrigger
} from '~/components/ui/drawer'
import {
  RadioToggleGroup,
  RadioToggleGroupItem
} from '~/components/ui/radio-toggle-group'
import { UserAvatar } from '~/components/user/user-avatar'
import { getLegalLinks } from '~/constants/navigation'
import { getLocaleDisplayName } from '~/helpers/locale'
import { matchIsUserAdmin, type SessionUser } from '~/helpers/role'
import { changeLocale } from '~/lib/change-locale'
import { cn } from '~/lib/utils'
import { m } from '~/paraglide/messages'
import { getLocale, locales, type Locale } from '~/paraglide/runtime'
import { listBookmarkedMemesQueryOpts } from '~/queries/bookmark'
import { getPremiumSubscriptionQueryOpts } from '~/queries/subscription'
import { useCookieConsentStore } from '~/stores/cookie-consent.store'
import { useDialogStore } from '~/stores/dialog.store'

const ROW_CLASS =
  'flex min-h-11 w-full items-center gap-3 rounded-lg px-2 text-base font-medium touch-tap active:bg-muted [&_svg]:size-5 [&_svg]:shrink-0 [&_svg]:text-muted-foreground'
const SECTION_CLASS = 'flex flex-col gap-1 border-t py-3 first:border-t-0'
const LEGAL_LINK_CLASS =
  'inline-flex min-h-9 items-center text-sm text-muted-foreground touch-tap active:text-foreground'

const accountDrawerHandle = DrawerPrimitive.createHandle()

const closeAccountDrawer = () => {
  accountDrawerHandle.close()
}

type AccountLinkProps = {
  to: LinkOptions['to']
  children: React.ReactNode
}

const AccountLink = ({ to, children }: AccountLinkProps) => {
  return (
    <Link to={to} onClick={closeAccountDrawer} className={ROW_CLASS}>
      {children}
    </Link>
  )
}

type LegalSectionProps = {
  onManageCookies: () => void
}

const LegalSection = ({ onManageCookies }: LegalSectionProps) => {
  const hasConsented = useSelector(useCookieConsentStore(), (state) => {
    return state.consent.hasConsented
  })

  return (
    <nav
      aria-label={m.nav_legal()}
      className={cn(SECTION_CLASS, 'flex-row flex-wrap gap-x-4 gap-y-0 px-2')}
    >
      {getLegalLinks().map((link) => {
        return (
          <Link
            key={link.to}
            to={link.to}
            onClick={closeAccountDrawer}
            className={LEGAL_LINK_CLASS}
          >
            {link.label}
          </Link>
        )
      })}
      {hasConsented ? (
        <DrawerClose onClick={onManageCookies} className={LEGAL_LINK_CLASS}>
          {m.cookie_manage()}
        </DrawerClose>
      ) : null}
    </nav>
  )
}

const PreferencesSection = () => {
  const currentLocale = getLocale()

  return (
    <div className={cn(SECTION_CLASS, 'gap-3 px-2')}>
      <RadioToggleGroup<Locale>
        value={currentLocale}
        onValueChange={changeLocale}
        variant="outline"
        aria-label={m.nav_switch_language()}
        className="w-full"
      >
        {locales.map((locale) => {
          const Flag = LOCALE_FLAGS[locale]

          return (
            <RadioToggleGroupItem
              key={locale}
              value={locale}
              className="h-11 gap-2 capitalize"
            >
              <Flag className={FLAG_ICON_CLASS} />
              {getLocaleDisplayName(locale, locale)}
            </RadioToggleGroupItem>
          )
        })}
      </RadioToggleGroup>
      <div className="flex min-h-11 items-center justify-between">
        <span className="text-base font-medium">{m.nav_dark_mode()}</span>
        <ThemeSwitcher />
      </div>
    </div>
  )
}

type InstallAfterCloseProps = {
  onInstall: (install: () => Promise<void>) => void
}

type InstallAppRowProps = InstallAfterCloseProps

const InstallAppRow = ({ onInstall }: InstallAppRowProps) => {
  const { method, install } = useInstallApp()

  if (method === null || method === 'installed') {
    return null
  }

  return (
    <DrawerClose
      className={ROW_CLASS}
      onClick={() => {
        onInstall(install)
      }}
    >
      <MonitorDown />
      {m.install_cta()}
    </DrawerClose>
  )
}

type OfferLinksProps = InstallAfterCloseProps & {
  isPremium: boolean
}

const OfferLinks = ({ isPremium, onInstall }: OfferLinksProps) => {
  return (
    <div className={SECTION_CLASS}>
      <InstallAppRow onInstall={onInstall} />
      {isPremium ? null : (
        <AccountLink to="/pricing">
          <SparklesIcon />
          {m.nav_upgrade_premium()}
        </AccountLink>
      )}
      <AccountLink to="/submit">
        <Plus />
        {m.nav_submit_meme()}
      </AccountLink>
    </div>
  )
}

type UserSectionsProps = InstallAfterCloseProps & {
  user: SessionUser
}

const UserSections = ({ user, onInstall }: UserSectionsProps) => {
  const { goToBillingPortal } = useStripeCheckout()
  const { signOut } = useSignOut()
  const bookmarkedMemesQuery = useQuery(listBookmarkedMemesQueryOpts())
  const premiumSubscriptionQuery = useQuery(getPremiumSubscriptionQueryOpts())
  const isPremium = useIsPremium()

  return (
    <>
      <div className="flex items-center gap-3 px-2 pb-3">
        <UserAvatar
          name={user.name}
          image={user.image}
          email={user.email}
          size="lg"
          shape="rounded"
        />
        <div className="grid min-w-0 flex-1 leading-tight">
          <span className="truncate font-semibold">{user.name}</span>
          <span className="truncate text-sm text-muted-foreground">
            {user.email}
          </span>
        </div>
      </div>
      <div className={SECTION_CLASS}>
        <AccountLink to="/bookmarks">
          <Star />
          {m.nav_my_bookmarks()}
          {bookmarkedMemesQuery.data?.count ? (
            <span className="ml-auto text-sm text-muted-foreground tabular-nums">
              {bookmarkedMemesQuery.data.count}
            </span>
          ) : null}
        </AccountLink>
        <AccountLink to="/settings">
          <Settings />
          {m.nav_settings()}
        </AccountLink>
        {premiumSubscriptionQuery.data ? (
          <DrawerClose
            className={ROW_CLASS}
            onClick={() => {
              void goToBillingPortal()
            }}
          >
            <CreditCard />
            {m.nav_manage_subscription()}
          </DrawerClose>
        ) : null}
        {matchIsUserAdmin(user) ? (
          <AccountLink to="/admin">
            <Shield />
            {m.nav_admin()}
          </AccountLink>
        ) : null}
      </div>
      <OfferLinks isPremium={isPremium} onInstall={onInstall} />
      <PreferencesSection />
      <div className={SECTION_CLASS}>
        <DrawerClose
          className={cn(ROW_CLASS, 'text-destructive [&_svg]:text-destructive')}
          onClick={() => {
            void signOut()
          }}
        >
          <LogOut />
          {m.nav_sign_out()}
        </DrawerClose>
      </div>
    </>
  )
}

type VisitorSectionsProps = InstallAfterCloseProps & {
  onSignIn: () => void
}

const VisitorSections = ({ onSignIn, onInstall }: VisitorSectionsProps) => {
  return (
    <>
      <div className="px-2 pb-3">
        <DrawerClose
          onClick={onSignIn}
          className={cn(
            buttonVariants({ size: 'lg' }),
            'h-11 w-full text-base'
          )}
        >
          {m.nav_sign_in()}
        </DrawerClose>
      </div>
      <OfferLinks isPremium={false} onInstall={onInstall} />
      <PreferencesSection />
    </>
  )
}

export const AccountDrawer = () => {
  const { user } = useRouteContext({ from: '__root__' })
  const dialogStore = useDialogStore()
  const matchRoute = useMatchRoute()
  const { openSettings } = useCookieConsentStore().actions
  const pendingActionRef = React.useRef<(() => void) | null>(null)
  const runAfterClose = (action: () => void) => {
    pendingActionRef.current = action
  }

  const installAfterClose = (install: () => Promise<void>) => {
    runAfterClose(() => {
      void install()
    })
  }

  const isAccountPage = Boolean(
    matchRoute({ to: '/settings' }) || matchRoute({ to: '/bookmarks' })
  )

  return (
    <Drawer
      handle={accountDrawerHandle}
      showSwipeHandle
      onOpenChangeComplete={(isOpen) => {
        if (isOpen) {
          return
        }

        const pendingAction = pendingActionRef.current
        pendingActionRef.current = null
        pendingAction?.()
      }}
    >
      <DrawerTrigger
        data-current={isAccountPage ? '' : undefined}
        className={TAB_ITEM_CLASS}
      >
        {user ? (
          <span aria-hidden="true">
            <UserAvatar
              name={user.name}
              image={user.image}
              email={user.email}
              size="sm"
              shape="circle"
            />
          </span>
        ) : (
          <CircleUser aria-hidden="true" />
        )}
        {m.nav_account()}
      </DrawerTrigger>
      <DrawerContent>
        <DrawerTitle className="sr-only">{m.nav_account()}</DrawerTitle>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-2 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
          {user ? (
            <UserSections user={user} onInstall={installAfterClose} />
          ) : (
            <VisitorSections
              onInstall={installAfterClose}
              onSignIn={() => {
                runAfterClose(() => {
                  dialogStore.actions.showDialog('auth')
                })
              }}
            />
          )}
          <LegalSection
            onManageCookies={() => {
              runAfterClose(openSettings)
            }}
          />
        </div>
      </DrawerContent>
    </Drawer>
  )
}
