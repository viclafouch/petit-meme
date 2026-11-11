import { useFormContext } from '~/components/form/form-context'
import { Button } from '~/components/ui/button'
import { LoadingButton } from '~/components/ui/loading-button'

type FormFooterProps = {
  submitLabel: string
  onCancel?: () => void
  isLoadingButton?: boolean
  isPending?: boolean
  formId?: string
}

export const FormFooter = ({
  onCancel,
  submitLabel,
  isLoadingButton = false,
  isPending = false,
  formId
}: FormFooterProps) => {
  const form = useFormContext()

  return (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      {onCancel ? (
        <Button onClick={onCancel} type="button" variant="outline">
          Annuler
        </Button>
      ) : null}
      <form.Subscribe
        selector={(state) => {
          return [state.canSubmit, state.isSubmitting] as const
        }}
        children={([canSubmit, isSubmitting]) => {
          const isBusy = isSubmitting || isPending

          return isLoadingButton ? (
            <LoadingButton
              type="submit"
              form={formId}
              isLoading={isBusy}
              disabled={!canSubmit}
            >
              {submitLabel}
            </LoadingButton>
          ) : (
            <Button
              variant="default"
              disabled={!canSubmit || isBusy}
              type="submit"
              form={formId}
            >
              {submitLabel}
            </Button>
          )
        }}
      />
    </div>
  )
}
