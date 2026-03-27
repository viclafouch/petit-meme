import { toast } from 'sonner'
import type { z } from 'zod'
import { FormFooter } from '~/components/form-footer'
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
import { useKeywordsField } from '~/hooks/use-keywords-field'
import { getFieldErrorMessage } from '~/lib/utils'
import type { Locale } from '~/paraglide/runtime'
import { locales } from '~/paraglide/runtime'
import type { EnrichedCategory } from '~/server/categories'
import {
  addCategory,
  CATEGORY_FORM_SCHEMA,
  editCategory
} from '~/server/categories'
import type { AnyFieldApi } from '@tanstack/react-form'
import { useForm } from '@tanstack/react-form'
import { useMutation } from '@tanstack/react-query'

import { KeywordsField } from '~admin/-components/keywords-field'

export type CategoryFormParams =
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
}: CategoryFormParams) => {
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

  const form = useForm({
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
                keywords: translation?.keywords ?? ([] as string[])
              }
            })
          }
        : {
            slug: '',
            translations: buildLocaleRecord(() => {
              return {
                title: '',
                keywords: [] as string[]
              }
            })
          },
    validators: {
      onChange: CATEGORY_FORM_SCHEMA
    },
    onSubmit: async ({ value }) => {
      if (manageCategoryMutation.isPending) {
        return
      }

      await manageCategoryMutation.mutateAsync(value)
    }
  })

  const frKeywordsField = useKeywordsField({
    setKeywordsValue: (updater) => {
      return form.setFieldValue('translations.fr.keywords', updater)
    }
  })

  const enKeywordsField = useKeywordsField({
    setKeywordsValue: (updater) => {
      return form.setFieldValue('translations.en.keywords', updater)
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
            const errorMessage = getFieldErrorMessage({ field })

            return (
              <FormItem error={errorMessage}>
                <FormLabel>Slug</FormLabel>
                <FormControl>
                  <Input
                    required
                    type="text"
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => {
                      return field.handleChange(
                        event.target.value.toLowerCase()
                      )
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
              <form.Field
                name={`translations.${locale}.title`}
                children={(field: AnyFieldApi) => {
                  const errorMessage = getFieldErrorMessage({ field })

                  return (
                    <FormItem error={errorMessage}>
                      <FormLabel>{meta.label}</FormLabel>
                      <FormControl>
                        <Input
                          required
                          type="text"
                          name={field.name}
                          value={field.state.value as string}
                          onBlur={field.handleBlur}
                          onChange={(event) => {
                            return field.handleChange(event.target.value)
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )
                }}
              />
              <form.Field
                name={`translations.${locale}.keywords`}
                children={(field: AnyFieldApi) => {
                  return (
                    <KeywordsField field={field} {...keywordsFields[locale]} />
                  )
                }}
              />
            </fieldset>
          )
        })}
      </div>
      <form.Subscribe
        selector={(state) => {
          return [state.canSubmit, state.isSubmitting]
        }}
        children={([canSubmit = false, isSubmitting = false]) => {
          return (
            <FormFooter
              canSubmit={canSubmit}
              isSubmitting={isSubmitting}
              onCancel={() => {
                return onClose?.()
              }}
              submitLabel="Enregistrer"
              isLoadingButton
            />
          )
        }}
      />
    </form>
  )
}
