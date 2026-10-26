import { Combobox as ComboboxPrimitive } from '@base-ui/react/combobox'
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor
} from '~/components/ui/combobox'
import {
  FormControl,
  FormItem,
  FormLabel,
  FormMessage
} from '~/components/ui/form'
import { Input } from '~/components/ui/input'
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
import type { MemeFormApi } from './use-meme-form'

const MEME_STATUS_SELECT_ITEMS = [
  MemeStatus.PENDING,
  MemeStatus.PUBLISHED,
  MemeStatus.ARCHIVED,
  MemeStatus.REJECTED
].map((status) => {
  return { value: status, label: MemeStatusMeta[status].label }
})

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
  const categoriesAnchor = useComboboxAnchor()
  const categoryItems = ComboboxPrimitive.createItems(categoriesOptions, {
    getValue: (category) => {
      return category.value
    },
    getLabel: (category) => {
      return category.label
    }
  })

  const getCategoryLabel = (categoryId: string) => {
    return categoriesOptions.find((category) => {
      return category.value === categoryId
    })?.label
  }

  const getCategoriesEmptyMessage = () => {
    if (isCategoriesLoading) {
      return 'Chargement...'
    }

    return categoriesError ? categoriesError.message : 'Aucun résultat.'
  }

  return (
    <>
      <form.Field
        name="status"
        children={(field) => {
          return (
            <FormItem error={getFieldErrorMessage(field.state.meta)}>
              <FormLabel>Statut</FormLabel>
              <Select
                items={MEME_STATUS_SELECT_ITEMS}
                value={field.state.value}
                onValueChange={(value) => {
                  if (value !== null) {
                    field.handleChange(value)
                  }
                }}
              >
                <FormControl render={<SelectTrigger className="w-full" />}>
                  <SelectValue placeholder="Sélectionnez un statut" />
                </FormControl>
                <SelectContent>
                  {MEME_STATUS_SELECT_ITEMS.map((item) => {
                    return (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    )
                  })}
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
              <Combobox
                multiple
                items={categoryItems}
                value={field.state.value}
                onValueChange={(categoryIds) => {
                  field.handleChange(categoryIds)
                }}
              >
                <ComboboxChips ref={categoriesAnchor} className="w-full">
                  <ComboboxValue>
                    {(categoryIds: string[]) => {
                      return (
                        <>
                          {categoryIds.map((categoryId) => {
                            return (
                              <ComboboxChip key={categoryId}>
                                {getCategoryLabel(categoryId)}
                              </ComboboxChip>
                            )
                          })}
                          <FormControl
                            render={
                              <ComboboxChipsInput
                                placeholder={
                                  categoryIds.length > 0
                                    ? undefined
                                    : 'Sélectionnez une catégorie...'
                                }
                              />
                            }
                          />
                        </>
                      )
                    }}
                  </ComboboxValue>
                </ComboboxChips>
                <ComboboxContent anchor={categoriesAnchor}>
                  <ComboboxEmpty>{getCategoriesEmptyMessage()}</ComboboxEmpty>
                  <ComboboxList>
                    {(category: CategoryOption) => {
                      return (
                        <ComboboxItem
                          key={category.value}
                          value={category.value}
                        >
                          {category.label}
                        </ComboboxItem>
                      )
                    }}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
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
              <FormControl
                render={
                  <Input
                    type="text"
                    name={field.name}
                    value={field.state.value ?? ''}
                    onBlur={field.handleBlur}
                    onChange={(event) => {
                      field.handleChange(event.target.value)
                    }}
                  />
                }
              />
              <FormMessage />
            </FormItem>
          )
        }}
      />
    </>
  )
}
