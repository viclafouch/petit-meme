import { Button } from '~/components/ui/button'
import { LoadingButton } from '~/components/ui/loading-button'

type FormFooterProps = {
  canSubmit: boolean
  isSubmitting: boolean
  submitLabel: string
  onCancel?: () => void
  isLoadingButton?: boolean
  formId?: string
}

export const FormFooter = ({
  canSubmit,
  isSubmitting,
  onCancel,
  submitLabel,
  isLoadingButton = false,
  formId
}: FormFooterProps) => {
  return (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      {onCancel ? (
        <Button onClick={onCancel} type="button" variant="outline">
          Annuler
        </Button>
      ) : null}
      {isLoadingButton ? (
        <LoadingButton
          type="submit"
          form={formId}
          isLoading={isSubmitting}
          disabled={!canSubmit}
        >
          {submitLabel}
        </LoadingButton>
      ) : (
        <Button
          variant="default"
          disabled={!canSubmit || isSubmitting}
          type="submit"
          form={formId}
        >
          {submitLabel}
        </Button>
      )}
    </div>
  )
}
