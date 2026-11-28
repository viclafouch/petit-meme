type CountedCategory = {
  memeCount: number
}

export const sortByMemeCount = <TCategory extends CountedCategory>(
  categories: readonly TCategory[]
) => {
  return categories.toSorted((first, second) => {
    return second.memeCount - first.memeCount
  })
}
