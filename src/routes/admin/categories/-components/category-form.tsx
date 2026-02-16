import React from 'react'
import { toast } from 'sonner'
import type { z } from 'zod'
import { KeywordsField } from '@/components/admin/keywords-field'
import { Button } from '@/components/ui/button'
import {
  FormControl,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { LoadingButton } from '@/components/ui/loading-button'
import type { Category } from '@/db/generated/prisma/client'
import { useKeywordsField } from '@/hooks/use-keywords-field'
import { getFieldErrorMessage } from '@/lib/utils'
import {
  addCategory,
  CATEGORY_FORM_SCHEMA,
  editCategory
} from '@/server/categories'
import { useForm } from '@tanstack/react-form'
import { useMutation } from '@tanstack/react-query'

export type CategoryFormProps =
  | {
      type: 'edit'
      onClose?: () => void
      category: Category
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
          }
        })

        return promise
      }

      const promise = addCategory({ data: body })
      toast.promise(promise, {
        loading: 'Ajout en cours...',
        success: () => {
          return 'Catégorie ajoutée avec succès !'
        }
      })

      return promise
    },
    onSuccess
  })

  const form = useForm({
    defaultValues:
      type === 'edit'
        ? {
            keywords: category.keywords,
            title: category.title,
            slug: category.slug
          }
        : {
            keywords: [] as string[],
            title: '',
            slug: ''
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

  const keywordsField = useKeywordsField({
    setKeywordsValue: (updater) => {
      return form.setFieldValue('keywords', updater)
    }
  })

  return (
    <form
      id={`${type}-category-form`}
      noValidate
      className="w-full flex flex-col gap-y-6"
      onSubmit={(event) => {
        event.preventDefault()
        keywordsField.handleAddKeyword()
        void form.handleSubmit()
      }}
    >
      <div className="flex flex-col gap-y-6">
        <form.Field
          name="title"
          children={(field) => {
            const errorMessage = getFieldErrorMessage({ field })

            return (
              <FormItem error={errorMessage}>
                <FormLabel>Titre</FormLabel>
                <FormControl>
                  <Input
                    required
                    type="text"
                    name={field.name}
                    value={field.state.value}
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
        <form.Field
          name="keywords"
          children={(field) => {
            return <KeywordsField field={field} {...keywordsField} />
          }}
        />
      </div>
      <form.Subscribe
        selector={(state) => {
          return [state.canSubmit, state.isSubmitting]
        }}
        children={([canSubmit, isSubmitting = false]) => {
          return (
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={onClose}>
                Annuler
              </Button>
              <LoadingButton
                type="submit"
                isLoading={isSubmitting}
                disabled={!canSubmit}
              >
                Enregistrer
              </LoadingButton>
            </div>
          )
        }}
      />
    </form>
  )
}
