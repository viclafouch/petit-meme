import type { Components } from 'react-markdown'
import { Separator } from '~/components/ui/separator'
import { baseLocale, getLocale } from '~/paraglide/runtime'

export const BASE_MARKDOWN_COMPONENTS = {
  h1: ({ children, ...props }) => {
    return (
      <h1 className="text-2xl font-bold text-primary" {...props}>
        {children}
      </h1>
    )
  },
  h2: ({ children, ...props }) => {
    return (
      <h2 className="text-xl font-bold text-primary" {...props}>
        {children}
      </h2>
    )
  },
  h3: ({ children, ...props }) => {
    return (
      <h3 className="text-lg font-semibold text-primary" {...props}>
        {children}
      </h3>
    )
  },
  p: (props) => {
    return <p className="my-3" {...props} />
  },
  ul: (props) => {
    return <ul className="my-3 ml-3 list-disc" {...props} />
  },
  code: (props) => {
    return (
      <code
        className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs"
        {...props}
      />
    )
  },
  table: (props) => {
    return (
      <div className="my-4 overflow-x-auto">
        <table className="w-full border-collapse text-sm" {...props} />
      </div>
    )
  },
  thead: (props) => {
    return <thead className="bg-muted" {...props} />
  },
  th: (props) => {
    return (
      <th
        className="border border-border px-3 py-2 text-left font-semibold"
        {...props}
      />
    )
  },
  td: (props) => {
    return <td className="border border-border px-3 py-2" {...props} />
  },
  hr: () => {
    return <Separator className="my-4" />
  },
  a: ({ href, children, ...props }) => {
    if (href?.startsWith('/')) {
      const locale = getLocale()
      const localizedHref = locale === baseLocale ? href : `/${locale}${href}`

      return (
        <a className="text-info underline" href={localizedHref} {...props}>
          {children}
        </a>
      )
    }

    return (
      <a
        className="text-info underline"
        target="_blank"
        rel="noopener noreferrer"
        href={href}
        {...props}
      >
        {children}
      </a>
    )
  }
} as const satisfies Components
