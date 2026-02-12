import Markdown from 'react-markdown'
import { BASE_MARKDOWN_COMPONENTS } from '@/constants/markdown'
import { seo } from '@/lib/seo'
import md from '~/md/terms-of-use.md?raw'
import { createFileRoute } from '@tanstack/react-router'

const RouteComponent = () => {
  return (
    <div>
      <Markdown components={BASE_MARKDOWN_COMPONENTS}>{md}</Markdown>
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
