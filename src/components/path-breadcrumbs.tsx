import React from 'react'
import { Home } from 'lucide-react'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@/components/ui/breadcrumb'
import { isMatch, Link, useMatches } from '@tanstack/react-router'

export const PathBreadcrumbs = () => {
  const matches = useMatches()

  if (
    matches.some((match) => {
      return match.status === 'pending'
    })
  ) {
    return null
  }

  const matchesWithCrumbs = matches.filter((match) => {
    return isMatch(match, 'loaderData.crumb')
  })

  if (matchesWithCrumbs.length === 0) {
    return null
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem className="shrink-0">
          <BreadcrumbLink asChild>
            <Link to="/admin">
              <Home className="size-4" />
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator className="shrink-0" />
        {matchesWithCrumbs.map((match, index) => {
          const isLast = index === matchesWithCrumbs.length - 1

          return (
            <React.Fragment key={match.fullPath}>
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage className="truncate">
                    {match.loaderData?.crumb}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild className="truncate">
                    <Link from={match.fullPath}>{match.loaderData?.crumb}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast ? <BreadcrumbSeparator /> : null}
            </React.Fragment>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
