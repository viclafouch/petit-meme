import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert'
import { Button } from '~/components/ui/button'
import { DialogClose, DialogFooter } from '~/components/ui/dialog'
import { LoadingButton } from '~/components/ui/loading-button'
import { getErrorMessage } from '~/helpers/error'

type ImportFormFooterProps = {
  error: Error | null
  isSubmitting: boolean
}

export const ImportFormFooter = ({
  error,
  isSubmitting
}: ImportFormFooterProps) => {
  return (
    <>
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Import impossible</AlertTitle>
          <AlertDescription>{getErrorMessage(error)}</AlertDescription>
        </Alert>
      ) : null}
      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>
          Annuler
        </DialogClose>
        <LoadingButton
          type="submit"
          isLoading={isSubmitting}
          loadingText="Import en cours..."
        >
          Importer
        </LoadingButton>
      </DialogFooter>
    </>
  )
}
