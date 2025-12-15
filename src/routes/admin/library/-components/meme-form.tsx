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
import { MultiAsyncSelect } from '@/components/ui/multi-select'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  MemeStatusFixed,
  MemeStatusMeta,
  type MemeWithCategories
} from '@/constants/meme'
import type { Meme, MemeStatus } from '@/db/generated/prisma/client'
import { getCategoriesListQueryOpts } from '@/lib/queries'
import { getFieldErrorMessage } from '@/lib/utils'
import { editMeme, MEME_FORM_SCHEMA } from '@/server/admin'
import { useForm } from '@tanstack/react-form'
import { useMutation, useQuery } from '@tanstack/react-query'

export const MemeForm = ({
  meme,
  onCancel,
  onSuccess
}: {
  meme: MemeWithCategories
  onCancel: () => void
  onSuccess?: () => void
}) => {
  const [keywordValue, setKeywordValue] = React.useState<string>('')

  const categoriesListQuery = useQuery(getCategoriesListQueryOpts())

  const categoriesOptions = React.useMemo(() => {
    return (
      categoriesListQuery.data
        ?.filter((category) => {
          return category.slug !== 'news'
        })
        .map((category) => {
          return {
            label: category.title,
            value: category.id
          }
        }) ?? []
    )
  }, [categoriesListQuery.data])

  const editMutation = useMutation({
    mutationKey: ['edit-meme'],
    mutationFn: async (
      body: z.infer<typeof MEME_FORM_SCHEMA> & { id: Meme['id'] }
    ) => {
      const promise = editMeme({ data: body })
      toast.promise(promise, {
        loading: 'Modification...',
        success: () => {
          return 'Mème modifié avec succès !'
        }
      })

      return promise
    },
    onSuccess
  })

  const form = useForm({
    defaultValues: {
      keywords: meme.keywords,
      tweetUrl: meme.tweetUrl,
      title: meme.title,
      status: meme.status,
      categoryIds: meme.categories.map((category) => {
        return category.categoryId
      })
    },
    validators: {
      onChange: MEME_FORM_SCHEMA
    },
    onSubmit: async ({ value }) => {
      if (editMutation.isPending) {
        return
      }

      await editMutation.mutateAsync({
        title: value.title,
        keywords: value.keywords,
        tweetUrl: value.tweetUrl,
        status: value.status,
        id: meme.id,
        categoryIds: value.categoryIds
      })
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
      id="edit-meme-form"
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
          name="status"
          children={(field) => {
            const errorMessage = getFieldErrorMessage({ field })

            return (
              <FormItem error={errorMessage}>
                <FormLabel>Statut</FormLabel>
                <FormControl>
                  <Select
                    value={field.state.value}
                    onValueChange={(value) => {
                      return field.handleChange(value as MemeStatus)
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Sélectionnez un statut" />
                    </SelectTrigger>
                    <SelectContent className="w-full">
                      <SelectItem value={MemeStatusFixed.PENDING}>
                        {MemeStatusMeta.PENDING.label}
                      </SelectItem>
                      <SelectItem value={MemeStatusFixed.PUBLISHED}>
                        {MemeStatusMeta.PUBLISHED.label}
                      </SelectItem>
                      <SelectItem value={MemeStatusFixed.ARCHIVED}>
                        {MemeStatusMeta.ARCHIVED.label}
                      </SelectItem>
                      <SelectItem value={MemeStatusFixed.REJECTED}>
                        {MemeStatusMeta.REJECTED.label}
                      </SelectItem>
                    </SelectContent>
                  </Select>
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
        <form.Field
          name="categoryIds"
          children={(field) => {
            const errorMessage = getFieldErrorMessage({ field })

            return (
              <FormItem error={errorMessage}>
                <FormLabel>Catégories</FormLabel>
                <FormControl>
                  <MultiAsyncSelect
                    loading={categoriesListQuery.isLoading}
                    error={categoriesListQuery.error}
                    options={categoriesOptions.filter((category) => {
                      return category.value !== 'news'
                    })}
                    value={field.state.value}
                    onValueChange={(value) => {
                      return field.handleChange(value)
                    }}
                    hideSelectAll
                    closeText="Fermer"
                    clearText="Effacer"
                    className="w-full"
                    searchPlaceholder="Rechercher..."
                    placeholder="Sélectionnez une catégorie..."
                    maxCount={6}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )
          }}
        />
        <form.Field
          name="tweetUrl"
          children={(field) => {
            const errorMessage = getFieldErrorMessage({ field })

            return (
              <FormItem error={errorMessage}>
                <FormLabel>Twitter URL</FormLabel>
                <FormControl>
                  <Input
                    required
                    type="text"
                    name={field.name}
                    value={field.state.value ?? ''}
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
      </div>
      <form.Subscribe
        selector={(state) => {
          return [state.canSubmit, state.isSubmitting]
        }}
        children={([canSubmit, isSubmitting = false]) => {
          return (
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button onClick={onCancel} type="button" variant="outline">
                Annuler
              </Button>
              <LoadingButton
                type="submit"
                form="edit-meme-form"
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
