import { toast } from 'sonner'
import type { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { FLAG_ICON_CLASS, LOCALE_FLAGS } from '~/components/icon/flags'
import {
  FormControl,
  FormItem,
  FormLabel,
  FormMessage
} from '~/components/ui/form'
import { Input } from '~/components/ui/input'
import { getErrorMessage } from '~/helpers/error'
import {
  buildLocaleRecord,
  findTranslationByLocale,
  LOCALE_META
} from '~/helpers/i18n-content'
import { useAppForm } from '~/hooks/use-app-form'
import { useKeywordsField } from '~/hooks/use-keywords-field'
import { focusFirstInvalidField, getFieldErrorMessage } from '~/lib/form'
import { locales, type Locale } from '~/paraglide/runtime'
import { KeywordsField } from '~/routes/admin/-components/keywords-field'
import {
  addCategory,
  CATEGORY_FORM_SCHEMA,
  editCategory,
  type EnrichedCategory
} from '~/server/categories'

export type CategoryFormProps =
  | {
      type: 'edit'
      onClose?: () => void
      category: EnrichedCategory
      onSuccess?: () => void
    }
  | {
      type: 'add'
      onClose?: () => void
      category?: never
      onSuccess?: () => void
    }

export const CategoryForm = ({
  type,
  category,
  onSuccess,
  onClose
}: CategoryFormProps) => {
  const manageCategoryMutation = useMutation({
    mutationFn: async (body: z.infer<typeof CATEGORY_FORM_SCHEMA>) => {
      if (type === 'edit') {
        const promise = editCategory({
          data: {
            ...body,
            id: category.id
          }
        })
        toast.promise(promise, {
          loading: 'Modification en cours...',
          success: () => {
            return 'Catégorie modifiée avec succès !'
          },
          error: getErrorMessage
        })

        return promise
      }

      const promise = addCategory({ data: body })
      toast.promise(promise, {
        loading: 'Ajout en cours...',
        success: () => {
          return 'Catégorie ajoutée avec succès !'
        },
        error: getErrorMessage
      })

      return promise
    },
    onSuccess
  })

  const form = useAppForm({
    defaultValues:
      type === 'edit'
        ? {
            slug: category.slug,
            translations: buildLocaleRecord((locale) => {
              const translation = findTranslationByLocale(
                category.translations,
                locale
              )

              return {
                title: translation?.title ?? '',
                keywords: (translation?.keywords ?? []) satisfies string[]
              }
            })
          }
        : {
            slug: '',
            translations: buildLocaleRecord(() => {
              return {
                title: '',
                keywords: [] satisfies string[]
              }
            })
          },
    validators: {
      onChange: CATEGORY_FORM_SCHEMA
    },
    onSubmitInvalid: focusFirstInvalidField,
    onSubmit: async ({ value }) => {
      if (manageCategoryMutation.isPending) {
        return
      }

      await manageCategoryMutation.mutateAsync(value)
    }
  })

  const frKeywordsField = useKeywordsField({
    setKeywordsValue: (updater) => {
      form.setFieldValue('translations.fr.keywords', updater)
    }
  })

  const enKeywordsField = useKeywordsField({
    setKeywordsValue: (updater) => {
      form.setFieldValue('translations.en.keywords', updater)
    }
  })

  const keywordsFields = {
    fr: frKeywordsField,
    en: enKeywordsField
  } satisfies Record<Locale, ReturnType<typeof useKeywordsField>>

  return (
    <form
      id={`${type}-category-form`}
      noValidate
      className="w-full flex flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault()

        for (const locale of locales) {
          keywordsFields[locale].handleAddKeyword()
        }

        void form.handleSubmit()
      }}
    >
      <div className="flex flex-col gap-6">
        <form.Field
          name="slug"
          children={(field) => {
            return (
              <FormItem error={getFieldErrorMessage(field.state.meta)}>
                <FormLabel>Slug</FormLabel>
                <FormControl>
                  <Input
                    required
                    type="text"
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => {
                      field.handleChange(event.target.value.toLowerCase())
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )
          }}
        />
        {locales.map((locale) => {
          const meta = LOCALE_META[locale]
          const Flag = LOCALE_FLAGS[locale]

          return (
            <fieldset
              key={locale}
              className="flex flex-col gap-4 rounded-lg border p-4"
            >
              <legend className="flex items-center gap-1.5 px-2 text-sm font-medium">
                <Flag className={FLAG_ICON_CLASS} />
                {meta.label}
              </legend>
              <form.AppField
                name={`translations.${locale}.title`}
                children={(field) => {
                  return (
                    <field.TextField label={meta.label} required type="text" />
                  )
                }}
              />
              <form.AppField
                name={`translations.${locale}.keywords`}
                children={() => {
                  return <KeywordsField {...keywordsFields[locale]} />
                }}
              />
            </fieldset>
          )
        })}
      </div>
      <form.AppForm>
        <form.FormFooter
          onCancel={() => {
            return onClose?.()
          }}
          submitLabel="Enregistrer"
          isLoadingButton
        />
      </form.AppForm>
    </form>
  )
}
