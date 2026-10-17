import { DefaultLoading } from '~/components/default-loading'
import { MemeReels } from '~/components/Meme/meme-reels'

export const ReelsPage = () => {
  return (
    <div className="bg-primary-foreground dark">
      <MemeReels />
    </div>
  )
}

export const ReelsPending = () => {
  return <DefaultLoading className="bg-primary-foreground dark h-screen" />
}
