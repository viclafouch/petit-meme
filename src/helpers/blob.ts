export const base64ToBlob = (base64: string, mimeType: string) => {
  const bytes = Uint8Array.from(atob(base64), (char) => {
    return char.codePointAt(0)!
  })

  return new Blob([bytes], { type: mimeType })
}
