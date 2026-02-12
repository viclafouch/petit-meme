/* eslint-disable jsx-a11y/anchor-has-content */
/* eslint-disable id-length */
/* eslint-disable jsx-a11y/heading-has-content */
import Markdown from 'react-markdown'
import { Separator } from '@/components/ui/separator'
import { seo } from '@/lib/seo'
import md from '~/md/terms-of-use.md?raw'
import { createFileRoute } from '@tanstack/react-router'

const RouteComponent = () => {
  return (
    <div>
      <Markdown
        components={{
          h1: (props) => {
            return <h1 className="text-2xl font-bold text-primary" {...props} />
          },
          h2: (props) => {
            return <h2 className="text-xl font-bold text-primary" {...props} />
          },
          p: (props) => {
            return <p className="my-3" {...props} />
          },
          ul: (props) => {
            return <ul className="list-disc my-3 ml-3" {...props} />
          },
          hr: () => {
            return <Separator className="my-4" />
          },
          a: (props) => {
            return (
              <a className="text-info underline" target="_blank" {...props} />
            )
          }
        }}
      >
        {md}
      </Markdown>
    </div>
  )
}

export const Route = createFileRoute('/_public__root/_default/terms-of-use')({
  component: RouteComponent,
  staleTime: Infinity,
  head: () => {
    return seo({
      title: "Conditions d'utilisation",
      pathname: '/terms-of-use',
      description:
        "En utilisant notre site (https://petit-meme.io) et nos services, vous acceptez les présentes Conditions d'utilisation."
    })
  }
})
