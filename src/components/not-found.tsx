import { buttonVariants } from '~/components/ui/button'
import { m } from '~/paraglide/messages.js'
import { Link } from '@tanstack/react-router'

export const NotFound = () => {
  return (
    <div className="flex items-center px-4 py-12 sm:px-6 md:px-8 lg:px-12 xl:px-16">
      <title>{m.error_not_found_title()}</title>
      <meta name="robots" content="noindex,nofollow" />
      <div className="w-full space-y-6 text-center">
        <div className="space-y-3">
          <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl">
            404
          </h1>
          <p className="text-muted-foreground">
            {m.error_not_found_description()}
          </p>
        </div>
        <Link to="/" className={buttonVariants({ variant: 'default' })}>
          {m.error_back_to_site()}
        </Link>
      </div>
    </div>
  )
}
