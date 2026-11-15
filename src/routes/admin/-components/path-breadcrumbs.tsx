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
import type { useCrumbMatches } from '~/routes/admin/-components/use-crumb-matches'

type PathBreadcrumbsProps = {
  crumbMatches: ReturnType<typeof useCrumbMatches>
}

export const PathBreadcrumbs = ({ crumbMatches }: PathBreadcrumbsProps) => {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem className="shrink-0">
          <BreadcrumbLink
            render={<Link to="/admin" activeOptions={{ exact: true }} />}
          >
            <House className="size-4" aria-hidden />
            <span className="sr-only">Accueil</span>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {crumbMatches.map((match, index) => {
          const isLast = index === crumbMatches.length - 1

          return (
            <BreadcrumbItem key={match.fullPath} className="min-w-0">
              <BreadcrumbSeparator className="shrink-0" />
              {isLast ? (
                <BreadcrumbPage
                  className="truncate"
                  render={<Link from={match.fullPath} />}
                >
                  {match.loaderData?.crumb}
                </BreadcrumbPage>
              ) : (
                <BreadcrumbLink
                  className="truncate"
                  render={
                    <Link
                      from={match.fullPath}
                      activeOptions={{ exact: true }}
                    />
                  }
                >
                  {match.loaderData?.crumb}
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
