import * as React from 'react'
import { CircleAlert } from 'lucide-react'
import { mergeProps } from '@base-ui/react/merge-props'
import { useRender } from '@base-ui/react/use-render'
import { Label } from '~/components/ui/label'
import { cn } from '~/lib/utils'

const useFormField = () => {
  const itemContext = React.useContext(FormItemContext)

  const { id, error, hasDescription, setHasDescription } = itemContext

  return {
    id,
    error,
    hasDescription,
    setHasDescription,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`
  }
}

type FormItemContextValue = {
  id: string
  error?: string
  hasDescription: boolean
  setHasDescription: (hasDescription: boolean) => void
}

const FormItemContext = React.createContext<FormItemContextValue>(
  {} as FormItemContextValue
)

const FormItem = ({
  className,
  error,
  ...props
}: React.ComponentProps<'div'> & { error?: string }) => {
  const id = React.useId()
  const [hasDescription, setHasDescription] = React.useState(false)

  const value = React.useMemo(() => {
    return {
      id,
      error,
      hasDescription,
      setHasDescription
    }
  }, [id, error, hasDescription])

  return (
    <FormItemContext value={value}>
      <div
        data-slot="form-item"
        className={cn('grid gap-1.5 w-full', className)}
        {...props}
      />
    </FormItemContext>
  )
}

const FormLabel = ({
  className,
  ...props
}: React.ComponentProps<typeof Label>) => {
  const { error, formItemId } = useFormField()

  return (
    <Label
      data-slot="form-label"
      data-error={Boolean(error)}
      className={cn('data-[error=true]:text-destructive', className)}
      htmlFor={formItemId}
      {...props}
    />
  )
}

const FormControl = ({ render, ...props }: useRender.ComponentProps<'div'>) => {
  const {
    error,
    hasDescription,
    formItemId,
    formDescriptionId,
    formMessageId
  } = useFormField()
  const describedByIds = [
    hasDescription ? formDescriptionId : null,
    error ? formMessageId : null
  ].filter(Boolean)

  return useRender({
    render,
    props: mergeProps<'div'>(
      {
        id: formItemId,
        'aria-describedby':
          describedByIds.length > 0 ? describedByIds.join(' ') : undefined,
        'aria-invalid': Boolean(error)
      },
      props
    ),
    state: {
      slot: 'form-control'
    }
  })
}

const FormDescription = ({
  className,
  ...props
}: React.ComponentProps<'p'>) => {
  const { formDescriptionId, setHasDescription } = useFormField()

  React.useEffect(() => {
    setHasDescription(true)

    return () => {
      setHasDescription(false)
    }
  }, [setHasDescription])

  return (
    <p
      data-slot="form-description"
      id={formDescriptionId}
      className={cn('text-muted-foreground text-sm', className)}
      {...props}
    />
  )
}

const FormMessage = ({ className, ...props }: React.ComponentProps<'p'>) => {
  const { error, formMessageId } = useFormField()
  const body = error ? String(error ?? '') : props.children

  if (!body) {
    return null
  }

  return (
    <p
      data-slot="form-message"
      id={formMessageId}
      className={cn(
        'text-destructive text-sm flex items-start gap-1.5',
        className
      )}
      {...props}
    >
      <CircleAlert aria-hidden="true" className="size-3.5 mt-[3px] shrink-0" />
      {body}
    </p>
  )
}

export {
  FormControl,
  FormDescription,
  FormItem,
  FormLabel,
  FormMessage,
  useFormField
}
