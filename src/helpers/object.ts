export const matchIsOwnKey = <TRecord extends object>(
  record: TRecord,
  key: PropertyKey
): key is keyof TRecord => {
  return Object.hasOwn(record, key)
}
