import React from 'react'
import { Stars } from 'lucide-react'
import { toast } from 'sonner'
import type { z } from 'zod'
import { FormFooter } from '@/components/admin/form-footer'
import { KeywordsField } from '@/components/admin/keywords-field'
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
import { Textarea } from '@/components/ui/textarea'
import {
  MemeStatusMeta,
  type MemeWithCategories,
  VIRTUAL_CATEGORY_SLUGS
} from '@/constants/meme'
import type { Meme } from '@/db/generated/prisma/client'
import { MemeStatus } from '@/db/generated/prisma/enums'
import { useKeywordsField } from '@/hooks/use-keywords-field'
import { getCategoriesListQueryOpts } from '@/lib/queries'
import { getFieldErrorMessage } from '@/lib/utils'
import { editMeme, MEME_FORM_SCHEMA } from '@/server/admin'
import { generateMemeContent } from '@/server/ai'
import { removeDuplicates } from '@/utils/array'
import { useForm } from '@tanstack/react-form'
import { useMutation, useQuery } from '@tanstack/react-query'

type MemeFormParams = {
  meme: MemeWithCategories
  onCancel: () => void
  onSuccess?: () => void
}

// eslint-disable-next-line max-lines-per-function
export const MemeForm = ({ meme, onCancel, onSuccess }: MemeFormParams) => {
  const categoriesListQuery = useQuery(getCategoriesListQueryOpts())

  // eslint-disable-next-line no-restricted-syntax
  const categoriesOptions = React.useMemo(() => {
    return (
      categoriesListQuery.data
        ?.filter((category) => {
          return !VIRTUAL_CATEGORY_SLUGS.has(category.slug)
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
      description: meme.description,
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
        description: value.description,
        status: value.status,
        id: meme.id,
        categoryIds: value.categoryIds
      })
    }
  })

  const keywordsField = useKeywordsField({
    setKeywordsValue: (updater) => {
      return form.setFieldValue('keywords', updater)
    }
  })

  const generateContentMutation = useMutation({
    mutationKey: ['generate-content'],
    mutationFn: () => {
      return generateMemeContent({ data: { memeId: meme.id } })
    },
    onSuccess: (result) => {
      form.setFieldValue('description', result.description)
      form.setFieldValue('keywords', (prevValue) => {
        return removeDuplicates([...prevValue, ...result.keywords])
      })
    },
    onError: (error) => {
      toast.error(error.message)
    }
  })

  return (
    <form
      id="edit-meme-form"
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
          name="description"
          children={(field) => {
            const errorMessage = getFieldErrorMessage({ field })

            return (
              <FormItem error={errorMessage}>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    required
                    name={field.name}
                    onBlur={field.handleBlur}
                    value={field.state.value}
                    onChange={(event) => {
                      return field.handleChange(event.target.value)
                    }}
                  />
                </FormControl>
                <div className="flex justify-end gap-2 items-center">
                  <span className="text-xs text-muted-foreground">
                    {field.state.value.length}/200 caractères
                  </span>
                  <LoadingButton
                    isLoading={generateContentMutation.isPending}
                    loadingText="Génération en cours..."
                    size="sm"
                    type="button"
                    variant="default"
                    onClick={() => {
                      return generateContentMutation.mutate()
                    }}
                  >
                    <Stars />
                    Générer une description
                  </LoadingButton>
                </div>
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
                      <SelectItem value={MemeStatus.PENDING}>
                        {MemeStatusMeta.PENDING.label}
                      </SelectItem>
                      <SelectItem value={MemeStatus.PUBLISHED}>
                        {MemeStatusMeta.PUBLISHED.label}
                      </SelectItem>
                      <SelectItem value={MemeStatus.ARCHIVED}>
                        {MemeStatusMeta.ARCHIVED.label}
                      </SelectItem>
                      <SelectItem value={MemeStatus.REJECTED}>
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
                    options={categoriesOptions}
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
        children={([canSubmit = false, isSubmitting = false]) => {
          return (
            <FormFooter
              canSubmit={canSubmit}
              isSubmitting={isSubmitting}
              onCancel={onCancel}
              submitLabel="Enregistrer"
              isLoadingButton
              formId="edit-meme-form"
            />
          )
        }}
      />
    </form>
  )
}
