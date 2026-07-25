export const AVATAR_STYLE_ID = 'adventurer-neutral'

export const AVATAR_DIRECTORY = '/avatars'

export const AVATAR_BACKGROUND_PALETTE = [
  '#b6e3f4',
  '#c0aede',
  '#d1d4f9',
  '#ffd5dc',
  '#ffdfbf'
] as const satisfies readonly string[]

type AvatarSlot = {
  id: string
  seed: string
}

export const AVATAR_CATALOG = [
  { id: 'avatar-01', seed: 'petit-meme-01' },
  { id: 'avatar-02', seed: 'petit-meme-02' },
  { id: 'avatar-03', seed: 'petit-meme-03' },
  { id: 'avatar-04', seed: 'petit-meme-04' },
  { id: 'avatar-05', seed: 'petit-meme-05' },
  { id: 'avatar-06', seed: 'petit-meme-06' },
  { id: 'avatar-07', seed: 'petit-meme-07' },
  { id: 'avatar-08', seed: 'petit-meme-08' },
  { id: 'avatar-09', seed: 'petit-meme-09' },
  { id: 'avatar-10', seed: 'petit-meme-10' },
  { id: 'avatar-11', seed: 'petit-meme-11' },
  { id: 'avatar-12', seed: 'petit-meme-12' },
  { id: 'avatar-13', seed: 'petit-meme-13' },
  { id: 'avatar-14', seed: 'petit-meme-14' },
  { id: 'avatar-15', seed: 'petit-meme-15' },
  { id: 'avatar-16', seed: 'petit-meme-16' },
  { id: 'avatar-17', seed: 'petit-meme-17' },
  { id: 'avatar-18', seed: 'petit-meme-18' },
  { id: 'avatar-19', seed: 'petit-meme-19' },
  { id: 'avatar-20', seed: 'petit-meme-20' },
  { id: 'avatar-21', seed: 'petit-meme-21' },
  { id: 'avatar-22', seed: 'petit-meme-22' },
  { id: 'avatar-23', seed: 'petit-meme-23' },
  { id: 'avatar-24', seed: 'petit-meme-24' }
] as const satisfies readonly AvatarSlot[]

export type AvatarSlotId = (typeof AVATAR_CATALOG)[number]['id']

export const AVATAR_PROVIDER_SELECTION = 'provider'

export type AvatarSelection = AvatarSlotId | typeof AVATAR_PROVIDER_SELECTION
