export const serializeJsonLd = (value: unknown) => {
  return JSON.stringify(value).replaceAll('<', '\\u003c')
}
