import { DEFAULT_MEME_TITLE } from '~/constants/meme'

export const withDefaultMemeTitle = <TMeme extends { title: string }>(
  meme: TMeme
) => {
  return {
    ...meme,
    title: meme.title === '' ? DEFAULT_MEME_TITLE : meme.title
  }
}
