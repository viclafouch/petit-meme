const WEB_LINK_PATTERN = /https?:\/\/\S+/u

type GetSharedLinkParams = {
  url?: string
  text?: string
}

const findWebLink = (value: string | undefined) => {
  return value?.match(WEB_LINK_PATTERN)?.[0]
}

export const getSharedLink = ({ url, text }: GetSharedLinkParams) => {
  return findWebLink(url) ?? findWebLink(text)
}
