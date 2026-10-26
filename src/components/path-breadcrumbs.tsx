import React from 'react'
import { House } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '~/components/ui/breadcrumb'
import type { useCrumbMatches } from '~/hooks/use-crumb-matches'

type PathBreadcrumbsProps = {
  crumbMatches: ReturnType<typeof useCrumbMatches>
}

export const PathBreadcrumbs = ({ crumbMatches }: PathBreadcrumbsProps) => {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem className="shrink-0">
          <BreadcrumbLink render={<Link to="/admin" />}>
            <House className="size-4" />
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator className="shrink-0" />
        {crumbMatches.map((match, index) => {
          const isLast = index === crumbMatches.length - 1

          return (
            <React.Fragment key={match.fullPath}>
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage className="truncate">
                    {match.loaderData?.crumb}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink
                    className="truncate"
                    render={<Link from={match.fullPath} />}
                  >
                    {match.loaderData?.crumb}
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
