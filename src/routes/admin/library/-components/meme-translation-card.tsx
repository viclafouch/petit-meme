import { Languages } from 'lucide-react'
import { FLAG_ICON_CLASS, LOCALE_FLAGS } from '~/components/icon/flags'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader
} from '~/components/ui/card'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel
} from '~/components/ui/field'
import { Input } from '~/components/ui/input'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupText,
  InputGroupTextarea
} from '~/components/ui/input-group'
import { LoadingButton } from '~/components/ui/loading-button'
import {
  MEME_DESCRIPTION_MAX_LENGTH,
  MEME_TITLE_MIN_LENGTH
} from '~/constants/meme-form'
import { LOCALE_META } from '~/helpers/i18n-content'
import { matchIsFieldInvalid } from '~/lib/form'
import type { Locale } from '~/paraglide/runtime'
import { KeywordsField } from '~/routes/admin/-components/keywords-field'
import type { useKeywordsField } from '~/routes/admin/-components/use-keywords-field'
import { MemeSectionTitle } from './meme-section-title'
import type { MemeFormApi } from './use-meme-form'

type MemeTranslationCardProps = {
  index: number
  form: MemeFormApi
  locale: Locale
  keywordsField: ReturnType<typeof useKeywordsField>
  isTranslateVisible: boolean
  isTranslating: boolean
  onTranslate: () => void
}

export const MemeTranslationCard = ({
  index,
  form,
  locale,
  keywordsField,
  isTranslateVisible,
  isTranslating,
  onTranslate
}: MemeTranslationCardProps) => {
  const Flag = LOCALE_FLAGS[locale]

  return (
    <Card>
      <CardHeader>
        <MemeSectionTitle index={index}>
          <Flag className={FLAG_ICON_CLASS} />
          {LOCALE_META[locale].label}
        </MemeSectionTitle>
        <CardDescription>
          Le titre, la description et les mots-clés servent à la recherche.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup className="gap-6">
          <form.Field
            name={`translations.${locale}.title`}
            children={(field) => {
              const isInvalid = matchIsFieldInvalid(field.state.meta)

              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Titre</FieldLabel>
                  <Input
                    id={field.name}
                    name={field.name}
                    required
                    autoComplete="off"
                    aria-invalid={isInvalid}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => {
                      field.handleChange(event.target.value)
                    }}
                  />
                  {isInvalid ? (
                    <FieldError errors={field.state.meta.errors} />
                  ) : null}
                </Field>
              )
            }}
          />
          <form.Field
            name={`translations.${locale}.description`}
            children={(field) => {
              const isInvalid = matchIsFieldInvalid(field.state.meta)

              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Description</FieldLabel>
                  <InputGroup>
                    <InputGroupTextarea
                      id={field.name}
                      name={field.name}
                      rows={3}
                      className="min-h-20"
                      aria-invalid={isInvalid}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) => {
                        field.handleChange(event.target.value)
                      }}
                    />
                    <InputGroupAddon align="block-end">
                      <InputGroupText className="ml-auto tabular-nums">
                        {field.state.value.length}/{MEME_DESCRIPTION_MAX_LENGTH}
                      </InputGroupText>
                    </InputGroupAddon>
                  </InputGroup>
                  {isInvalid ? (
                    <FieldError errors={field.state.meta.errors} />
                  ) : null}
                </Field>
              )
            }}
          />
          <form.AppField
            name={`translations.${locale}.keywords`}
            children={() => {
              return <KeywordsField {...keywordsField} />
            }}
          />
        </FieldGroup>
      </CardContent>
      {isTranslateVisible ? (
        <form.Subscribe
          selector={(state) => {
            return state.values.translations[locale]
          }}
          children={(translation) => {
            const canTranslate =
              translation.title.length >= MEME_TITLE_MIN_LENGTH &&
              translation.description.length > 0 &&
              translation.keywords.length > 0

            return (
              <CardFooter className="justify-end border-t">
                <LoadingButton
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!canTranslate}
                  isLoading={isTranslating}
                  loadingText="Traduction..."
                  onClick={onTranslate}
                >
                  <Languages data-icon="inline-start" aria-hidden />
                  Traduire vers les autres langues
                </LoadingButton>
              </CardFooter>
            )
          }}
        />
      ) : null}
    </Card>
  )
}
