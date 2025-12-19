export const removeDuplicates = <T>(array: T[]) => {
  return [...new Set(array)]
}
