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
import { MemeStatusMeta } from '@/constants/meme'
import { MemeStatus } from '@/db/generated/prisma/enums'
import { getFieldErrorMessage } from '@/lib/utils'
import type { AnyFieldApi } from '@tanstack/react-form'

type CategoryOption = {
  label: string
  value: string
}

type MemeFormMetadataFieldsParams = {
  statusField: AnyFieldApi
  categoryIdsField: AnyFieldApi
  tweetUrlField: AnyFieldApi
  categoriesOptions: CategoryOption[]
  isCategoriesLoading: boolean
  categoriesError: Error | null
}

export const MemeFormMetadataFields = ({
  statusField,
  categoryIdsField,
  tweetUrlField,
  categoriesOptions,
  isCategoriesLoading,
  categoriesError
}: MemeFormMetadataFieldsParams) => {
  const statusError = getFieldErrorMessage({ field: statusField })
  const categoryIdsError = getFieldErrorMessage({ field: categoryIdsField })
  const tweetUrlError = getFieldErrorMessage({ field: tweetUrlField })

  return (
    <>
      <FormItem error={statusError}>
        <FormLabel>Statut</FormLabel>
        <FormControl>
          <Select
            value={statusField.state.value as string}
            onValueChange={(value) => {
              return statusField.handleChange(value as MemeStatus)
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Sélectionnez un statut" />
            </SelectTrigger>
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
        </FormControl>
        <FormMessage />
      </FormItem>
      <FormItem error={categoryIdsError}>
        <FormLabel>Catégories</FormLabel>
        <FormControl>
          <MultiAsyncSelect
            loading={isCategoriesLoading}
            error={categoriesError}
            options={categoriesOptions}
            value={categoryIdsField.state.value as string[]}
            onValueChange={(value) => {
              return categoryIdsField.handleChange(value)
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
      <FormItem error={tweetUrlError}>
        <FormLabel>Twitter URL</FormLabel>
        <FormControl>
          <Input
            type="text"
            name={tweetUrlField.name}
            value={(tweetUrlField.state.value as string | null) ?? ''}
            onBlur={tweetUrlField.handleBlur}
            onChange={(event) => {
              return tweetUrlField.handleChange(event.target.value)
            }}
          />
        </FormControl>
        <FormMessage />
      </FormItem>
    </>
  )
}
