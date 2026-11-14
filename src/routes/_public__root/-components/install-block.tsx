import { Link } from '@tanstack/react-router'
import { AppIcon } from '~/components/install/app-icon'
import { InstallAppButton } from '~/components/install/install-app-button'
import { useInstallMethod } from '~/components/install/use-install-app'
import { m } from '~/paraglide/messages'
import { PageHeading2 } from '~/routes/_public__root/-components/page-headers'

export const InstallBlock = () => {
  const method = useInstallMethod()

  if (method === null || method === 'installed') {
    return null
  }

  return (
    <section className="flex flex-col items-center gap-5 text-center">
      <AppIcon size={80} className="size-20 shadow-xl" />
      <div className="flex max-w-sm flex-col gap-2">
        <PageHeading2 className="text-balance">
          {m.home_install_heading()}
        </PageHeading2>
        <p className="text-muted-foreground text-pretty">
          {m.home_install_description()}
        </p>
      </div>
      <div className="flex w-full max-w-xs flex-col items-center gap-2">
        <InstallAppButton surface="home" className="w-full" />
        <Link
          to="/app"
          className="inline-flex min-h-11 items-center text-sm text-muted-foreground underline-offset-4 touch-tap active:text-foreground"
        >
          {m.home_install_learn_more()}
        </Link>
      </div>
    </section>
  )
}
