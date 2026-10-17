import { Card } from '~/components/ui/card'
import { Skeleton } from '~/components/ui/skeleton'

const TILE_SKELETON_KEYS = [
  'first',
  'second',
  'third',
  'fourth'
] as const satisfies readonly string[]

const ROW_SKELETON_KEYS = [
  'first',
  'second',
  'third',
  'fourth',
  'fifth'
] as const satisfies readonly string[]

export const SummarySkeleton = () => {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {TILE_SKELETON_KEYS.map((skeletonKey) => {
        return (
          <div
            key={skeletonKey}
            className="flex flex-col gap-3 rounded-xl border bg-card p-4"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="size-4" />
            </div>
            <Skeleton className="h-7 w-16" />
          </div>
        )
      })}
    </div>
  )
}

export const TotalsSkeleton = () => {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {TILE_SKELETON_KEYS.map((skeletonKey) => {
        return (
          <div
            key={skeletonKey}
            className="flex items-center gap-3 rounded-xl border bg-card p-4"
          >
            <Skeleton className="size-9 rounded-lg" />
            <div className="flex flex-col gap-1">
              <Skeleton className="h-5 w-12" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        )
      })}
    </div>
  )
}

export const TrendingSkeleton = () => {
  return (
    <div className="flex flex-col gap-3">
      {ROW_SKELETON_KEYS.map((skeletonKey) => {
        return (
          <div key={skeletonKey} className="flex items-center gap-3">
            <Skeleton className="size-6 rounded-full" />
            <Skeleton className="size-10 rounded-md" />
            <div className="flex flex-1 flex-col gap-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
        )
      })}
    </div>
  )
}

export const FeedSkeleton = () => {
  return (
    <div className="flex flex-col gap-3">
      {ROW_SKELETON_KEYS.map((skeletonKey) => {
        return (
          <div key={skeletonKey} className="flex items-start gap-3">
            <Skeleton className="size-7 rounded-md" />
            <div className="flex flex-col gap-1">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        )
      })}
    </div>
  )
}

export const ChartSkeleton = () => {
  return (
    <Card>
      <div className="flex flex-col gap-2 px-6">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-4 w-36" />
      </div>
      <div className="flex flex-col gap-4 px-6">
        <div className="flex gap-4">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-14" />
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="h-62.5 w-full rounded-lg" />
      </div>
    </Card>
  )
}
