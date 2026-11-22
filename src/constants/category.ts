import { CategoryFamily } from '~/db/generated/prisma/enums'

export const CATEGORY_FAMILIES = [
  CategoryFamily.MOOD,
  CategoryFamily.REPLY,
  CategoryFamily.THEME,
  CategoryFamily.SOURCE
] as const satisfies readonly CategoryFamily[]

export const CATEGORY_FAMILY_LABELS = {
  MOOD: 'Humeur',
  REPLY: 'Pour répondre',
  THEME: 'Thème',
  SOURCE: 'Source'
} as const satisfies Record<CategoryFamily, string>

export const CATEGORY_EMOJIS = [
  'face-with-tears-of-joy',
  'beaming-face-with-smiling-eyes',
  'crying-face',
  'loudly-crying-face',
  'pouting-face',
  'grimacing-face',
  'partying-face',
  'thinking-face',
  'face-with-symbols-on-mouth',
  'smirking-face',
  'face-screaming-in-fear',
  'nauseated-face',
  'smiling-face-with-heart-eyes',
  'sleeping-face',
  'exploding-head',
  'face-with-rolling-eyes',
  'zany-face',
  'pleading-face',
  'skull',
  'clown-face',
  'see-no-evil-monkey',
  'folded-hands',
  'cross-mark',
  'check-mark-button',
  'waving-hand',
  'thumbs-up',
  'red-heart',
  'fire',
  'sparkles',
  'hamburger',
  'briefcase',
  'soccer-ball',
  'clinking-beer-mugs',
  'boxing-glove',
  'billed-cap',
  'classical-building',
  'television',
  'clapper-board',
  'play-button',
  'studio-microphone',
  'joystick',
  'musical-note',
  'money-bag',
  'cat-face',
  'dog-face',
  'birthday-cake',
  'christmas-tree',
  'automobile',
  'books'
] as const

export type CategoryEmoji = (typeof CATEGORY_EMOJIS)[number]

export const CATEGORY_EMOJI_LABELS = {
  'face-with-tears-of-joy': 'Mort de rire',
  'beaming-face-with-smiling-eyes': 'Grand sourire',
  'crying-face': 'Larme',
  'loudly-crying-face': 'Pleurs',
  'pouting-face': 'Colère',
  'grimacing-face': 'Grimace',
  'partying-face': 'Fête',
  'thinking-face': 'Réflexion',
  'face-with-symbols-on-mouth': 'Injures',
  'smirking-face': 'Sourire en coin',
  'face-screaming-in-fear': 'Peur',
  'nauseated-face': 'Dégoût',
  'smiling-face-with-heart-eyes': 'Amoureux',
  'sleeping-face': 'Fatigue',
  'exploding-head': 'Choc',
  'face-with-rolling-eyes': 'Yeux au ciel',
  'zany-face': 'Fou',
  'pleading-face': 'Supplication',
  skull: 'Mort',
  'clown-face': 'Clown',
  'see-no-evil-monkey': 'Gêne',
  'folded-hands': 'Merci',
  'cross-mark': 'Non',
  'check-mark-button': 'Oui',
  'waving-hand': 'Salut',
  'thumbs-up': 'Pouce',
  'red-heart': 'Cœur',
  fire: 'Feu',
  sparkles: 'Étincelles',
  hamburger: 'Nourriture',
  briefcase: 'Travail',
  'soccer-ball': 'Sport',
  'clinking-beer-mugs': 'Alcool',
  'boxing-glove': 'Bagarre',
  'billed-cap': 'Casquette',
  'classical-building': 'Politique',
  television: 'Télévision',
  'clapper-board': 'Cinéma',
  'play-button': 'Vidéo',
  'studio-microphone': 'Micro',
  joystick: 'Jeu vidéo',
  'musical-note': 'Musique',
  'money-bag': 'Argent',
  'cat-face': 'Chat',
  'dog-face': 'Chien',
  'birthday-cake': 'Anniversaire',
  'christmas-tree': 'Noël',
  automobile: 'Voiture',
  books: 'École'
} as const satisfies Record<CategoryEmoji, string>

export const CATEGORY_FALLBACK_EMOJI = 'sparkles' satisfies CategoryEmoji

export const CATEGORY_EMOJI_PATH = '/images/emoji'

export const matchIsCategoryEmoji = (
  value: string | null
): value is CategoryEmoji => {
  return CATEGORY_EMOJIS.some((emoji) => {
    return emoji === value
  })
}
