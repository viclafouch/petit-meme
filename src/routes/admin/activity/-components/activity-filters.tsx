import { SearchInput } from '~/components/search-input'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '~/components/ui/dropdown-menu'
import { ACTIVITY_SCOPES } from '~/constants/activity'
import type { ActivityFilters, ActivityScope } from '~/constants/activity'
import type { ActivityEventType } from '~/db/generated/prisma/enums'
import {
  ACTIVITY_TYPE_DISPLAY,
  ACTIVITY_TYPE_OPTIONS
} from '~/routes/admin/-helpers/activity'

const SCOPE_LABELS = {
  all: 'Tous',
  users: 'Connectés',
  anonymous: 'Anonymes'
} as const satisfies Record<ActivityScope, string>

type ActivityScopeToggleParams = {
  scope: ActivityScope
  onScopeChange: (scope: ActivityScope) => void
}

const ActivityScopeToggle = ({
  scope,
  onScopeChange
}: ActivityScopeToggleParams) => {
  return (
    <div
      className="flex gap-1.5"
      role="group"
      aria-label="Filtrer par visiteur"
    >
      {ACTIVITY_SCOPES.map((option) => {
        const isSelected = option === scope

        return (
          <Button
            key={option}
            type="button"
            variant={isSelected ? 'default' : 'outline'}
            size="sm"
            aria-pressed={isSelected}
            onClick={() => {
              onScopeChange(option)
            }}
          >
            {SCOPE_LABELS[option]}
          </Button>
        )
      })}
    </div>
  )
}

type ActivityTypeFilterParams = {
  types: ActivityEventType[]
  onTypesChange: (types?: ActivityFilters['types']) => void
}

const ActivityTypeFilter = ({
  types,
  onTypesChange
}: ActivityTypeFilterParams) => {
  const selectedTypes = new Set(types)

  const handleToggle = (type: ActivityEventType, isChecked: boolean) => {
    const nextTypes = isChecked
      ? [...types, type]
      : types.filter((selectedType) => {
          return selectedType !== type
        })

    onTypesChange(nextTypes.length > 0 ? nextTypes : undefined)
  }

  const handleReset = () => {
    onTypesChange()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button active={types.length > 0} variant="outline">
          Filtrer par type
          {types.length > 0 ? (
            <Badge variant="secondary" size="sm">
              {types.length}
            </Badge>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        {ACTIVITY_TYPE_OPTIONS.map((type) => {
          const { pluralLabel, icon: Icon } = ACTIVITY_TYPE_DISPLAY[type]

          return (
            <DropdownMenuCheckboxItem
              key={type}
              checked={selectedTypes.has(type)}
              onCheckedChange={(isChecked) => {
                handleToggle(type, isChecked)
              }}
              onSelect={(event) => {
                event.preventDefault()
              }}
            >
              <span className="flex items-center gap-1.5">
                <Icon className="size-3.5" aria-hidden />
                {pluralLabel}
              </span>
            </DropdownMenuCheckboxItem>
          )
        })}
        {types.length > 0 ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={handleReset}>
              Tout afficher
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

type ActivityFilterBarParams = {
  filters: ActivityFilters
  onFiltersChange: (nextFilters: Partial<ActivityFilters>) => void
}

export const ActivityFilterBar = ({
  filters,
  onFiltersChange
}: ActivityFilterBarParams) => {
  const handleSearchChange = (value: string) => {
    onFiltersChange({ search: value.length > 0 ? value : undefined })
  }

  const handleScopeChange = (scope: ActivityScope) => {
    onFiltersChange({ scope })
  }

  const handleTypesChange = (types?: ActivityFilters['types']) => {
    onFiltersChange({ types })
  }

  return (
    <div className="flex flex-col gap-3 border-b border-muted pb-4">
      <ActivityScopeToggle
        scope={filters.scope}
        onScopeChange={handleScopeChange}
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          value={filters.search ?? ''}
          placeholder="Rechercher une IP ou un email"
          onValueChange={handleSearchChange}
        />
        <ActivityTypeFilter
          types={filters.types ?? []}
          onTypesChange={handleTypesChange}
        />
      </div>
    </div>
  )
}
