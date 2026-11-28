const INTRO_SEEN_ATTRIBUTE = 'data-intro-seen'

const toStorageKey = (introKey: string) => {
  return `intro-seen:${introKey}`
}

export const buildIntroSeenScript = (introKey: string) => {
  const storageKey = JSON.stringify(toStorageKey(introKey))
  const attribute = JSON.stringify(INTRO_SEEN_ATTRIBUTE)
  const key = JSON.stringify(introKey)

  return `try{if(sessionStorage.getItem(${storageKey})){var r=document.documentElement;r.setAttribute(${attribute},((r.getAttribute(${attribute})||"")+" "+${key}).trim())}}catch(e){}`
}

const readSeenIntroKeys = () => {
  return (document.documentElement.getAttribute(INTRO_SEEN_ATTRIBUTE) ?? '')
    .split(' ')
    .filter(Boolean)
}

export const markIntroSeen = (introKey: string) => {
  const seenIntroKeys = readSeenIntroKeys()

  if (!seenIntroKeys.includes(introKey)) {
    document.documentElement.setAttribute(
      INTRO_SEEN_ATTRIBUTE,
      [...seenIntroKeys, introKey].join(' ')
    )
  }
}

const readSessionStorage = () => {
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

export const hasSeenIntro = (introKey: string) => {
  return Boolean(readSessionStorage()?.getItem(toStorageKey(introKey)))
}

export const rememberIntro = (introKey: string) => {
  readSessionStorage()?.setItem(toStorageKey(introKey), '1')
}
