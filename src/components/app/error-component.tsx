import React from 'react'
import { TriangleAlertIcon } from 'lucide-react'
import * as Sentry from '@sentry/tanstackstart-react'
import { useQueryErrorResetBoundary } from '@tanstack/react-query'
import {
  type ErrorComponentProps as RouterErrorComponentProps,
  Link,
  useRouter
} from '@tanstack/react-router'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '~/components/ui/accordion'
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert'
import { Button, buttonVariants } from '~/components/ui/button'
import { IS_PRODUCTION } from '~/constants/env'
import { cn } from '~/lib/utils'
import { m } from '~/paraglide/messages.js'

type ErrorComponentProps = Pick<RouterErrorComponentProps, 'error'>

export const ErrorComponent = ({ error }: ErrorComponentProps) => {
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
          <TriangleAlertIcon className="size-4" />
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
          <Link
            to="/"
            className={cn(
              buttonVariants({ variant: 'outline', className: 'w-full' })
            )}
          >
            {m.error_back_to_site()}
          </Link>
          {!IS_PRODUCTION && error instanceof Error ? (
            <Accordion className="w-full">
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
