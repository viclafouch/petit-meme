import React from 'react'
import { AlertTriangleIcon } from 'lucide-react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { useQueryErrorResetBoundary } from '@tanstack/react-query'
import { Link, useRouter } from '@tanstack/react-router'

export const ErrorComponent = ({ error }: { error: Error }) => {
  const router = useRouter()

  const queryClientErrorBoundary = useQueryErrorResetBoundary()

  const isDev = process.env.NODE_ENV !== 'production'

  React.useEffect(() => {
    queryClientErrorBoundary.reset()
  }, [queryClientErrorBoundary])

  return (
    <div className="mt-8 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Alert variant="destructive">
          <AlertTriangleIcon className="size-4" />
          <AlertTitle>Oups ! Une erreur s&apos;est produite</AlertTitle>
          <AlertDescription>
            Nous sommes désolés, mais le site web a rencontré un problème
            inattendu.
          </AlertDescription>
        </Alert>
        <div className="mt-4 space-y-4">
          <Button
            className="w-full"
            onClick={() => {
              void router.invalidate()
            }}
          >
            Réessayer
          </Button>
          <Button asChild className="w-full" variant="outline">
            <Link to="/">Retourner au site</Link>
          </Button>
          {isDev ? (
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="error-details">
                <AccordionTrigger>View error details</AccordionTrigger>
                <AccordionContent>
                  <div className="rounded-md bg-muted p-4">
                    <h3 className="mb-2 font-semibold">Error details:</h3>
                    <p className="mb-4 text-sm">{error.message}</p>
                    <h3 className="mb-2 font-semibold">Error trace:</h3>
                    <pre className="overflow-x-auto whitespace-pre-wrap text-xs">
                      {error.stack}
                    </pre>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          ) : null}
        </div>
      </div>
    </div>
  )
}
