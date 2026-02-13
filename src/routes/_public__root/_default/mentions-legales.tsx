import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { BASE_MARKDOWN_COMPONENTS } from '@/constants/markdown'
import { seo } from '@/lib/seo'
import md from '~/md/mentions-legales.md?raw'
import { createFileRoute } from '@tanstack/react-router'

const RouteComponent = () => {
  return (
    <div>
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={BASE_MARKDOWN_COMPONENTS}
      >
        {md}
      </Markdown>
    </div>
  )
}

export const Route = createFileRoute(
  '/_public__root/_default/mentions-legales'
)({
  component: RouteComponent,
  staleTime: Infinity,
  head: () => {
    return seo({
      title: 'Mentions légales',
      pathname: '/mentions-legales',
      description:
        'Mentions légales du site Petit Meme. Informations sur l’éditeur, l’hébergeur et la propriété intellectuelle.'
    })
  }
})
