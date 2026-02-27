import { FormFooter } from '@/components/form-footer'
import {
  FormControl,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { MultiAsyncSelect } from '@/components/ui/multi-select'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { MemeStatusMeta, type MemeWithCategories } from '@/constants/meme'
import { MemeStatus } from '@/db/generated/prisma/enums'
import { getFieldErrorMessage } from '@/lib/utils'
import { KeywordsField } from '@admin/-components/keywords-field'
import { MemeFormDescriptionField } from './meme-form-description-field'
import { useMemeForm } from './use-meme-form'

type MemeFormParams = {
  meme: MemeWithCategories
  onCancel: () => void
  onSuccess?: () => void
}

export const MemeForm = ({ meme, onCancel, onSuccess }: MemeFormParams) => {
  const {
    form,
    keywordsField,
    categoriesListQuery,
    categoriesOptions,
    generateContentMutation
  } = useMemeForm({ meme, onSuccess })

  return (
    <form
      id="edit-meme-form"
      noValidate
      className="flex flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault()
        keywordsField.handleAddKeyword()
        void form.handleSubmit()
      }}
    >
      <div className="flex flex-col gap-6">
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
            return (
              <MemeFormDescriptionField
                field={field}
                generateContentMutation={generateContentMutation}
              />
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
