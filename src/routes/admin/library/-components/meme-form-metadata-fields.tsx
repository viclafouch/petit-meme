import {
  FormControl,
  FormItem,
  FormLabel,
  FormMessage
} from '~/components/ui/form'
import { Input } from '~/components/ui/input'
import { MultiAsyncSelect } from '~/components/ui/multi-select'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '~/components/ui/select'
import { MemeStatusMeta } from '~/constants/meme'
import { MemeStatus } from '~/db/generated/prisma/enums'
import { getFieldErrorMessage } from '~/lib/form'
import { matchIsMemeStatus } from '~/routes/admin/-lib/meme-status'
import type { MemeFormApi } from './use-meme-form'

type CategoryOption = {
  label: string
  value: string
}

type MemeFormMetadataFieldsProps = {
  form: MemeFormApi
  categoriesOptions: CategoryOption[]
  isCategoriesLoading: boolean
  categoriesError: Error | null
}

export const MemeFormMetadataFields = ({
  form,
  categoriesOptions,
  isCategoriesLoading,
  categoriesError
}: MemeFormMetadataFieldsProps) => {
  return (
    <>
      <form.Field
        name="status"
        children={(field) => {
          return (
            <FormItem error={getFieldErrorMessage(field.state.meta)}>
              <FormLabel>Statut</FormLabel>
              <Select
                value={field.state.value}
                onValueChange={(value) => {
                  if (matchIsMemeStatus(value)) {
                    field.handleChange(value)
                  }
                }}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Sélectionnez un statut" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
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
              <FormMessage />
            </FormItem>
          )
        }}
      />
      <form.Field
        name="categoryIds"
        children={(field) => {
          return (
            <FormItem error={getFieldErrorMessage(field.state.meta)}>
              <FormLabel>Catégories</FormLabel>
              <FormControl>
                <MultiAsyncSelect
                  loading={isCategoriesLoading}
                  error={categoriesError}
                  options={categoriesOptions}
                  value={field.state.value}
                  onValueChange={(value) => {
                    field.handleChange(value)
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
          return (
            <FormItem error={getFieldErrorMessage(field.state.meta)}>
              <FormLabel>Twitter URL</FormLabel>
              <FormControl>
                <Input
                  type="text"
                  name={field.name}
                  value={field.state.value ?? ''}
                  onBlur={field.handleBlur}
                  onChange={(event) => {
                    field.handleChange(event.target.value)
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )
        }}
      />
    </>
  )
}
