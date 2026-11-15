import type { AnyFieldMeta, AnyFormApi } from '@tanstack/react-form'
import { createClientOnlyFn } from '@tanstack/react-start'

type FieldInteractionSource = {
  state: { meta: Pick<AnyFieldMeta, 'isBlurred' | 'isValid'> }
}

type FieldErrorSource = {
  state: {
    meta: Pick<AnyFieldMeta, 'isBlurred' | 'isValid'> & {
      errors: ({ message: string } | undefined)[]
    }
  }
}

export const matchIsFieldInvalid = (field: FieldInteractionSource) => {
  return field.state.meta.isBlurred && !field.state.meta.isValid
}

export const getFieldErrorMessage = (field: FieldErrorSource) => {
  return matchIsFieldInvalid(field)
    ? (field.state.meta.errors[0]?.message ?? '')
    : ''
}

const focusFirstRenderedInvalidField = () => {
  document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
}

type SubmitInvalidProps = {
  formApi: AnyFormApi
}

export const focusFirstInvalidField = createClientOnlyFn(
  ({ formApi }: SubmitInvalidProps) => {
    for (const fieldName of Object.keys(formApi.fieldInfo)) {
      if (formApi.getFieldMeta(fieldName) !== undefined) {
        formApi.setFieldMeta(fieldName, (meta) => {
          return { ...meta, isBlurred: true }
        })
      }
    }

    requestAnimationFrame(focusFirstRenderedInvalidField)
  }
)
