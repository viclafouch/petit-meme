import { Link } from '@tanstack/react-router'
import { cn } from '~/lib/utils'
import { CountryFlag } from '~/routes/admin/-components/country-flag'

type VisitorIpLinkProps = {
  ipAddress: string
  country: string | null
  className?: string
}

export const VisitorIpLink = ({
  ipAddress,
  country,
  className
}: VisitorIpLinkProps) => {
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
