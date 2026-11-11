import { useSuspenseQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { Container } from '~/components/ui/container'
import { getAdminMemeQueryOpts } from '~/routes/admin/-lib/queries'
import { MemeEditor } from './meme-editor'

const routeApi = getRouteApi('/admin/library/$memeId')

export const MemePage = () => {
  const { memeId } = routeApi.useParams()
  const memeQuery = useSuspenseQuery(getAdminMemeQueryOpts(memeId))

  return (
    <Container className="pb-16">
      <MemeEditor key={memeQuery.data.id} meme={memeQuery.data} />
    </Container>
  )
}
