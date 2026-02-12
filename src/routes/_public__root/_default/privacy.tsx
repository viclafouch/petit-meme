import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { BASE_MARKDOWN_COMPONENTS } from '@/constants/markdown'
import { seo } from '@/lib/seo'
import md from '~/md/privacy.md?raw'
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

export const Route = createFileRoute('/_public__root/_default/privacy')({
  component: RouteComponent,
  staleTime: Infinity,
  head: () => {
    return seo({
      title: 'Politique de confidentialité',
      pathname: '/privacy',
      description:
        'Politique de confidentialité de Petit Meme. Découvrez comment nous collectons, utilisons et protégeons vos données personnelles.'
    })
  }
})
