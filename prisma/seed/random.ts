import { randomBytes, randomInt } from 'node:crypto'

export const randomInteger = (min: number, max: number) => {
  return randomInt(min, max + 1)
}

export const randomChance = (probability: number) => {
  return Math.random() < probability
}

export const randomPick = <TItem>(items: readonly TItem[]) => {
  const item = items[randomInt(items.length)]

  if (item === undefined) {
    throw new Error('Cannot pick from an empty list')
  }

  return item
}

export const randomSample = <TItem>(items: readonly TItem[], count: number) => {
  return items
    .map((item) => {
      return { item, rank: Math.random() }
    })
    .toSorted((left, right) => {
      return left.rank - right.rank
    })
    .slice(0, count)
    .map(({ item }) => {
      return item
    })
}

export const randomDateBetween = (start: Date, end: Date) => {
  return new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime())
  )
}

export const randomHex = (bytes: number) => {
  return randomBytes(bytes).toString('hex')
}
