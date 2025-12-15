import React from 'react'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import type { z } from 'zod'
import { Badge } from '@/components/ui/badge'
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
  const [keywordValue, setKeywordValue] = React.useState<string>('')

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

  const handleAddKeyword = () => {
    if (keywordValue.trim()) {
      form.setFieldValue('keywords', (prevState) => {
        return [
          ...new Set([
            ...prevState,
            ...keywordValue
              .split(',')
              .map((keyword) => {
                return keyword.trim().toLowerCase()
              })
              .filter((word) => {
                return Boolean(word.trim())
              })
          ])
        ]
      })
    }

    setKeywordValue('')
  }

  const handleRemoveKeyword = (keywordIndex: number) => {
    form.setFieldValue('keywords', (prevState) => {
      return prevState.filter((_, index) => {
        return index !== keywordIndex
      })
    })
  }

  return (
    <form
      id={`${type}-category-form`}
      noValidate
      className="w-full flex flex-col gap-y-6"
      onSubmit={(event) => {
        event.preventDefault()
        handleAddKeyword()
        form.handleSubmit()
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
            const errorMessage = getFieldErrorMessage({ field })

            return (
              <FormItem error={errorMessage}>
                <FormLabel>Mots clés ({field.state.value.length})</FormLabel>
                <FormControl>
                  <Input
                    required
                    type="text"
                    name={field.name}
                    onBlur={field.handleBlur}
                    value={keywordValue}
                    onChange={(event) => {
                      setKeywordValue(event.target.value)
                    }}
                    enterKeyHint="done"
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        event.stopPropagation()
                        handleAddKeyword()
                      }
                    }}
                  />
                </FormControl>
                {field.state.value.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {field.state.value.map((keyword, index) => {
                      return (
                        <Badge variant="secondary" key={keyword}>
                          {keyword}
                          <button
                            onClick={(event) => {
                              event.preventDefault()
                              event.stopPropagation()
                              handleRemoveKeyword(index)
                            }}
                            aria-label="Supprimer"
                            type="button"
                            className="hover:bg-muted flex items-center p-0 cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      )
                    })}
                  </div>
                ) : null}
                <FormMessage />
              </FormItem>
            )
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
