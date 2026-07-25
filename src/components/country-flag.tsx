import { Globe } from 'lucide-react'
import { getCountryFlagUrl, getCountryName } from '~/helpers/country'
import { cn } from '~/lib/utils'
import { getLocale } from '~/paraglide/runtime'

type CountryFlagSize = 'sm' | 'md'

const COUNTRY_FLAG_SIZE_CLASSES = {
  sm: 'h-3 w-4',
  md: 'h-4.5 w-6'
} as const satisfies Record<CountryFlagSize, string>

type CountryFlagParams = {
  countryCode: string
  size?: CountryFlagSize
}

export const CountryFlag = ({
  countryCode,
  size = 'sm'
}: CountryFlagParams) => {
  const countryName = getCountryName(countryCode, getLocale())
  const label = countryName ?? `Pays inconnu (${countryCode})`
  const boxClassName = cn(
    'shrink-0 ring-1 ring-border',
    COUNTRY_FLAG_SIZE_CLASSES[size]
  )

  return (
    <span className="inline-flex items-center" title={label}>
      {countryName ? (
        <img
          src={getCountryFlagUrl(countryCode)}
          alt=""
          loading="lazy"
          decoding="async"
          className={cn(boxClassName, 'object-contain')}
        />
      ) : (
        <Globe
          className={cn(boxClassName, 'p-px text-muted-foreground')}
          aria-hidden
        />
      )}
      <span className="sr-only">{label}</span>
    </span>
  )
}
