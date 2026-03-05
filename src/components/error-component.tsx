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
import { IS_PRODUCTION } from '@/constants/env'
import { m } from '@/paraglide/messages.js'
import * as Sentry from '@sentry/tanstackstart-react'
import { useQueryErrorResetBoundary } from '@tanstack/react-query'
import { Link, useRouter } from '@tanstack/react-router'

export const ErrorComponent = ({ error }: { error: Error }) => {
  const router = useRouter()

  const queryErrorResetBoundary = useQueryErrorResetBoundary()

  React.useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  React.useEffect(() => {
    queryErrorResetBoundary.reset()
  }, [queryErrorResetBoundary])

  return (
    <div className="mt-8 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Alert variant="destructive">
          <AlertTriangleIcon className="size-4" />
          <AlertTitle>{m.error_title()}</AlertTitle>
          <AlertDescription>{m.error_description()}</AlertDescription>
        </Alert>
        <div className="mt-4 space-y-4">
          <Button
            className="w-full"
            onClick={() => {
              void router.invalidate()
            }}
          >
            {m.common_retry()}
          </Button>
          <Button asChild className="w-full" variant="outline">
            <Link to="/">{m.error_back_to_site()}</Link>
          </Button>
          {!IS_PRODUCTION ? (
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="error-details">
                <AccordionTrigger>{m.error_details_heading()}</AccordionTrigger>
                <AccordionContent>
                  <div className="rounded-md bg-muted p-4">
                    <h3 className="mb-2 font-semibold">
                      {m.error_details_label()}
                    </h3>
                    <p className="mb-4 text-sm">{error.message}</p>
                    <h3 className="mb-2 font-semibold">
                      {m.error_trace_label()}
                    </h3>
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
