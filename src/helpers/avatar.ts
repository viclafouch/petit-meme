import {
  AVATAR_CATALOG,
  AVATAR_DIRECTORY,
  AVATAR_PROVIDER_SELECTION,
  type AvatarSelection,
  type AvatarSlotId
} from '~/constants/avatar'

const FNV_OFFSET_BASIS = 2_166_136_261
const FNV_PRIME = 16_777_619

const hashString = (value: string) => {
  let hash = FNV_OFFSET_BASIS

  for (const character of value) {
    hash ^= character.codePointAt(0) ?? 0
    hash = Math.imul(hash, FNV_PRIME)
  }

  return Math.abs(hash)
}

export const resolveAvatarPath = (slotId: AvatarSlotId) => {
  return `${AVATAR_DIRECTORY}/${slotId}.svg`
}

export const matchIsAvatarPath = (image: string) => {
  return image.startsWith(`${AVATAR_DIRECTORY}/`)
}

type ResolveAvatarParams = {
  selection: AvatarSelection
  providerAvatar: string | null
}

export const resolveAvatar = ({
  selection,
  providerAvatar
}: ResolveAvatarParams) => {
  if (selection === AVATAR_PROVIDER_SELECTION) {
    return providerAvatar
  }

  return resolveAvatarPath(selection)
}

export const getAvatarSlotIdForEmail = (email: string) => {
  const index = hashString(email.trim().toLowerCase()) % AVATAR_CATALOG.length
  const slot = AVATAR_CATALOG[index] ?? AVATAR_CATALOG[0]

  return slot.id
}
