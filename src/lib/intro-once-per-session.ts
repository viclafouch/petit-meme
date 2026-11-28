const toStorageKey = (introKey: string) => {
  return `intro-seen:${introKey}`
}

const markIntroSeenIfStored = (element: Element, storageKey: string) => {
  try {
    if (window.sessionStorage.getItem(storageKey) === null) {
      return false
    }

    element.setAttribute('data-intro-seen', '')

    return true
  } catch {
    return false
  }
}

const rememberIntro = (storageKey: string) => {
  try {
    window.sessionStorage.setItem(storageKey, '1')

    return true
  } catch {
    return false
  }
}

export const playIntroOncePerSession = (element: Element, introKey: string) => {
  const storageKey = toStorageKey(introKey)

  if (!markIntroSeenIfStored(element, storageKey)) {
    rememberIntro(storageKey)
  }
}

export const buildIntroSeenScript = (introKey: string) => {
  return `(${markIntroSeenIfStored.toString()})(document.currentScript.parentElement,${JSON.stringify(toStorageKey(introKey))})`
}
