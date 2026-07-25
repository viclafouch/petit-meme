import { Link } from '@tanstack/react-router'
import { CountryFlag } from '~/components/country-flag'
import { cn } from '~/lib/utils'

type VisitorIpLinkParams = {
  ipAddress: string
  country: string | null
  className?: string
}

export const VisitorIpLink = ({
  ipAddress,
  country,
  className
}: VisitorIpLinkParams) => {
  return (
    <Link
      to="/admin/activity/$ip"
      params={{ ip: ipAddress }}
      className="flex min-w-0 items-center gap-2 py-1 hover:text-primary transition-colors"
    >
      {country ? <CountryFlag countryCode={country} /> : null}
      <span className={cn('truncate font-mono', className)}>{ipAddress}</span>
    </Link>
  )
}
