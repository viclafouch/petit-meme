import { Combobox as ComboboxPrimitive } from '@base-ui/react/combobox'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader
} from '~/components/ui/card'
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
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel
} from '~/components/ui/field'
import { Input } from '~/components/ui/input'
import { matchIsFieldInvalid } from '~/lib/form'
import { MemeSectionTitle } from './meme-section-title'
import type { MemeFormApi, useMemeForm } from './use-meme-form'

const CATEGORIES_FIELD_ID = 'meme-categories'

type CategoryOption = {
  label: string
  value: string
}

type MemeClassificationCardProps = {
  index: number
  form: MemeFormApi
  categoriesQuery: ReturnType<typeof useMemeForm>['categoriesListQuery']
}

export const MemeClassificationCard = ({
  index,
  form,
  categoriesQuery
}: MemeClassificationCardProps) => {
  const categoriesAnchor = useComboboxAnchor()
  const categoriesOptions =
    categoriesQuery.data?.map((category) => {
      return { label: category.title, value: category.id }
    }) ?? []

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
    if (categoriesQuery.isLoading) {
      return 'Chargement...'
    }

    return categoriesQuery.error
      ? categoriesQuery.error.message
      : 'Aucun résultat.'
  }

  return (
    <Card>
      <CardHeader>
        <MemeSectionTitle index={index}>Classement</MemeSectionTitle>
        <CardDescription>
          Les catégories rangent le Meme dans la bibliothèque.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup className="gap-6">
          <form.Field
            name="categoryIds"
            children={(field) => {
              const isInvalid = matchIsFieldInvalid(field.state.meta)

              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={CATEGORIES_FIELD_ID}>
                    Catégories
                  </FieldLabel>
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
                              <ComboboxChipsInput
                                id={CATEGORIES_FIELD_ID}
                                aria-invalid={isInvalid}
                                placeholder={
                                  categoryIds.length > 0
                                    ? undefined
                                    : 'Choisir une catégorie...'
                                }
                              />
                            </>
                          )
                        }}
                      </ComboboxValue>
                    </ComboboxChips>
                    <ComboboxContent anchor={categoriesAnchor}>
                      <ComboboxEmpty>
                        {getCategoriesEmptyMessage()}
                      </ComboboxEmpty>
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
                  {isInvalid ? (
                    <FieldError errors={field.state.meta.errors} />
                  ) : null}
                </Field>
              )
            }}
          />
          <form.Field
            name="tweetUrl"
            children={(field) => {
              const isInvalid = matchIsFieldInvalid(field.state.meta)

              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>
                    Tweet d&apos;origine
                  </FieldLabel>
                  <Input
                    id={field.name}
                    name={field.name}
                    type="url"
                    inputMode="url"
                    autoComplete="off"
                    placeholder="https://x.com/..."
                    aria-invalid={isInvalid}
                    value={field.state.value ?? ''}
                    onBlur={field.handleBlur}
                    onChange={(event) => {
                      field.handleChange(event.target.value)
                    }}
                  />
                  <FieldDescription>
                    Optionnel. Rempli tout seul pour un import depuis X.
                  </FieldDescription>
                  {isInvalid ? (
                    <FieldError errors={field.state.meta.errors} />
                  ) : null}
                </Field>
              )
            }}
          />
        </FieldGroup>
      </CardContent>
    </Card>
  )
}
