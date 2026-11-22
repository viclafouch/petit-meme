import { Radio } from '@base-ui/react/radio'
import { RadioGroup } from '@base-ui/react/radio-group'
import { CategoryEmojiImage } from '~/components/category/category-emoji-image'
import {
  CATEGORY_EMOJI_LABELS,
  CATEGORY_EMOJIS,
  CATEGORY_FAMILIES,
  CATEGORY_FAMILY_LABELS,
  type CategoryEmoji
} from '~/constants/category'
import type { CategoryFamily } from '~/db/generated/prisma/enums'

const NO_FAMILY = 'none'

const FAMILY_OPTION_CLASS_NAME =
  'pill pill-sm pill-outline data-checked:border-foreground data-checked:text-foreground'

type CategoryFamilyFieldProps = {
  value: CategoryFamily | null
  onValueChange: (family: CategoryFamily | null) => void
}

export const CategoryFamilyField = ({
  value,
  onValueChange
}: CategoryFamilyFieldProps) => {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-sm font-medium">Famille</legend>
      <RadioGroup<CategoryFamily | typeof NO_FAMILY>
        value={value ?? NO_FAMILY}
        onValueChange={(family) => {
          onValueChange(family === NO_FAMILY ? null : family)
        }}
        className="flex flex-wrap gap-2"
      >
        {CATEGORY_FAMILIES.map((family) => {
          return (
            <Radio.Root
              key={family}
              value={family}
              className={FAMILY_OPTION_CLASS_NAME}
            >
              {CATEGORY_FAMILY_LABELS[family]}
            </Radio.Root>
          )
        })}
        <Radio.Root value={NO_FAMILY} className={FAMILY_OPTION_CLASS_NAME}>
          Autres
        </Radio.Root>
      </RadioGroup>
    </fieldset>
  )
}

type CategoryEmojiFieldProps = {
  value: CategoryEmoji | null
  onValueChange: (emoji: CategoryEmoji | null) => void
}

export const CategoryEmojiField = ({
  value,
  onValueChange
}: CategoryEmojiFieldProps) => {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-sm font-medium">Emoji</legend>
      <RadioGroup<CategoryEmoji>
        value={value ?? undefined}
        onValueChange={onValueChange}
        className="grid grid-cols-[repeat(auto-fill,minmax(--spacing(11),1fr))] gap-1.5"
      >
        {CATEGORY_EMOJIS.map((emoji) => {
          return (
            <Radio.Root
              key={emoji}
              value={emoji}
              title={CATEGORY_EMOJI_LABELS[emoji]}
              aria-label={CATEGORY_EMOJI_LABELS[emoji]}
              className="grid aspect-square place-items-center rounded-lg border border-transparent bg-muted/40 transition-colors hover:bg-muted focus-visible:focus-ring data-checked:border-foreground data-checked:bg-muted"
            >
              <CategoryEmojiImage emoji={emoji} className="size-7" />
            </Radio.Root>
          )
        })}
      </RadioGroup>
    </fieldset>
  )
}
