import * as React from 'react'
import { Label } from '~/components/ui/label'
import { cn } from '~/lib/utils'
import type * as LabelPrimitive from '@radix-ui/react-label'
import { Slot } from '@radix-ui/react-slot'
import { CircleAlert } from 'lucide-react'

const useFormField = () => {
  const itemContext = React.useContext(FormItemContext)

  const { id, error } = itemContext

  return {
    id,
    error,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`
  }
}

type FormItemContextValue = {
  id: string
  error?: string
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

  const value = React.useMemo(() => {
    return {
      id,
      error
    }
  }, [id, error])

  return (
    <FormItemContext.Provider value={value}>
      <div
        data-slot="form-item"
        className={cn('grid gap-1.5 w-full', className)}
        {...props}
      />
    </FormItemContext.Provider>
  )
}

const FormLabel = ({
  className,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) => {
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

const FormControl = ({ ...props }: React.ComponentProps<typeof Slot>) => {
  const { error, formItemId, formDescriptionId, formMessageId } = useFormField()

  return (
    <Slot
      data-slot="form-control"
      id={formItemId}
      aria-describedby={
        !error
          ? `${formDescriptionId}`
          : `${formDescriptionId} ${formMessageId}`
      }
      aria-invalid={Boolean(error)}
      {...props}
    />
  )
}

const FormDescription = ({
  className,
  ...props
}: React.ComponentProps<'p'>) => {
  const { formDescriptionId } = useFormField()

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
      role="alert"
      className={cn('text-destructive text-sm flex items-start gap-1.5', className)}
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
