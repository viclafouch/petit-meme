import React from 'react'
import { Sparkles } from 'lucide-react'
import { CONTENT_LOCALE_FLAGS, FLAG_ICON_CLASS } from '~/components/icon/flags'
import { Button } from '~/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader
} from '~/components/ui/card'
import { Field, FieldError, FieldLabel } from '~/components/ui/field'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '~/components/ui/select'
import type { Meme } from '~/db/generated/prisma/client'
import {
  CONTENT_LOCALE_TO_LOCALE,
  getContentLocaleOptions
} from '~/helpers/i18n-content'
import { matchIsFieldInvalid } from '~/lib/form'
import type { Locale } from '~/paraglide/runtime'
import type { AiAssistResult } from '~/server/ai'
import { AiAssistDialog, type AiAssistFieldSelection } from './ai-assist-dialog'
import { MemeSectionTitle } from './meme-section-title'
import type { MemeFormApi } from './use-meme-form'

const CONTENT_LOCALE_FIELD_ID = 'meme-content-locale'

type MemeContentCardProps = {
  index: number
  form: MemeFormApi
  memeId: Meme['id']
}

export const MemeContentCard = ({
  index,
  form,
  memeId
}: MemeContentCardProps) => {
  const [isAiAssistOpen, setIsAiAssistOpen] = React.useState(false)

  const contentLocaleItems = getContentLocaleOptions().map((option) => {
    const Flag = CONTENT_LOCALE_FLAGS[option.value]

    return {
      value: option.value,
      label: (
        <span className="flex items-center gap-2">
          {Flag ? <Flag className={FLAG_ICON_CLASS} /> : null}
          {option.label}
        </span>
      )
    }
  })

  const handleAiAssistApply = (
    locale: Locale,
    result: AiAssistResult,
    fields: AiAssistFieldSelection
  ) => {
    if (fields.title) {
      form.setFieldValue(`translations.${locale}.title`, result.title)
    }

    if (fields.description) {
      form.setFieldValue(
        `translations.${locale}.description`,
        result.description
      )
    }

    if (fields.keywords) {
      form.setFieldValue(`translations.${locale}.keywords`, result.keywords)
    }
  }

  return (
    <Card>
      <CardHeader>
        <MemeSectionTitle index={index}>Contenu</MemeSectionTitle>
        <CardDescription>
          La langue de la vidéo décide des traductions à remplir.
        </CardDescription>
        <CardAction>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              setIsAiAssistOpen(true)
            }}
          >
            <Sparkles data-icon="inline-start" aria-hidden />
            AI Assist
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <form.Field
          name="contentLocale"
          children={(field) => {
            const isInvalid = matchIsFieldInvalid(field.state.meta)

            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={CONTENT_LOCALE_FIELD_ID}>
                  Langue du contenu
                </FieldLabel>
                <Select
                  items={contentLocaleItems}
                  value={field.state.value}
                  onValueChange={(value) => {
                    if (value !== null) {
                      field.handleChange(value)
                    }
                  }}
                >
                  <SelectTrigger
                    id={CONTENT_LOCALE_FIELD_ID}
                    aria-invalid={isInvalid}
                    className="w-full"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {contentLocaleItems.map((item) => {
                        return (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        )
                      })}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                {isInvalid ? (
                  <FieldError errors={field.state.meta.errors} />
                ) : null}
              </Field>
            )
          }}
        />
      </CardContent>
      <form.Subscribe
        selector={(state) => {
          return state.values.contentLocale
        }}
        children={(contentLocale) => {
          const applyLocale = CONTENT_LOCALE_TO_LOCALE[contentLocale]

          return (
            <AiAssistDialog
              memeId={memeId}
              contentLocale={contentLocale}
              currentValues={form.getFieldValue(`translations.${applyLocale}`)}
              isOpen={isAiAssistOpen}
              onOpenChange={setIsAiAssistOpen}
              onApply={handleAiAssistApply}
            />
          )
        }}
      />
    </Card>
  )
}
