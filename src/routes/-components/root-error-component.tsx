import React from 'react'
import * as Sentry from '@sentry/tanstackstart-react'
import {
  type ErrorComponentProps,
  HeadContent,
  Scripts
} from '@tanstack/react-router'
import { IS_PRODUCTION } from '~/constants/env'
import { m } from '~/paraglide/messages.js'
import { getLocale, getTextDirection, localizeHref } from '~/paraglide/runtime'

type RootErrorComponentProps = ErrorComponentProps

type RootErrorDocumentProps = {
  children: React.ReactNode
}

const RootErrorDocument = ({ children }: RootErrorDocumentProps) => {
  return (
    <html lang={getLocale()} dir={getTextDirection()}>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}

export const RootErrorComponent = ({
  error,
  reset
}: RootErrorComponentProps) => {
  React.useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <RootErrorDocument>
      <div
        style={{
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          fontFamily:
            'Bricolage Grotesque, ui-sans-serif, system-ui, sans-serif',
          backgroundColor: 'hsl(0 0% 3.9%)',
          color: 'hsl(0 0% 98%)'
        }}
      >
        <div style={{ maxWidth: '28rem', width: '100%', textAlign: 'center' }}>
          <h1
            style={{
              fontSize: '3rem',
              fontWeight: 700,
              letterSpacing: '-0.05em',
              marginBottom: '0.5rem'
            }}
          >
            500
          </h1>
          <p
            style={{
              color: 'hsl(0 0% 63.9%)',
              marginBottom: '2rem'
            }}
          >
            {m.error_root_description()}
          </p>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}
          >
            <button
              type="button"
              onClick={reset}
              style={{
                padding: '0.625rem 1.25rem',
                borderRadius: '0.5rem',
                border: 'none',
                backgroundColor: 'hsl(0 0% 98%)',
                color: 'hsl(0 0% 3.9%)',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer'
              }}
            >
              {m.common_retry()}
            </button>
            <a
              href={localizeHref('/')}
              style={{
                padding: '0.625rem 1.25rem',
                borderRadius: '0.5rem',
                border: '1px solid hsl(0 0% 14.9%)',
                backgroundColor: 'transparent',
                color: 'hsl(0 0% 98%)',
                fontWeight: 600,
                fontSize: '0.875rem',
                textDecoration: 'none',
                cursor: 'pointer'
              }}
            >
              {m.error_back_to_site()}
            </a>
          </div>
          {!IS_PRODUCTION && Error.isError(error) ? (
            <pre
              style={{
                marginTop: '2rem',
                padding: '1rem',
                borderRadius: '0.5rem',
                backgroundColor: 'hsl(0 0% 9%)',
                color: 'hsl(0 62.8% 70.6%)',
                fontSize: '0.75rem',
                textAlign: 'left',
                overflow: 'auto',
                whiteSpace: 'pre-wrap'
              }}
            >
              {error.message}
              {'\n'}
              {error.stack}
            </pre>
          ) : null}
        </div>
      </div>
    </RootErrorDocument>
  )
}
