export const removeDuplicates = <TItem>(array: TItem[]) => {
  return [...new Set(array)]
}
