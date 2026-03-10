import { cn } from '@/lib/utils'
import { m } from '@/paraglide/messages.js'
import { LoadingSpinner } from './ui/spinner'

export const DefaultLoading = ({
  className,
  ...restProps
}: React.ComponentProps<'div'>) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3',
        className
      )}
      {...restProps}
    >
      <LoadingSpinner className="text-muted-foreground size-6" />
      <p className="text-muted-foreground text-sm">{m.common_loading()}</p>
    </div>
  )
}
