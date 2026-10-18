import type { AnyFieldMeta } from '@tanstack/react-form'
import { createClientOnlyFn } from '@tanstack/react-start'

type FieldErrorMeta = Pick<AnyFieldMeta, 'isTouched' | 'isValid'> & {
  errors: ({ message: string } | undefined)[]
}

export function getFieldErrorMessage(meta: FieldErrorMeta) {
  return meta.isTouched && !meta.isValid ? (meta.errors[0]?.message ?? '') : ''
}

const focusFirstRenderedInvalidField = () => {
  document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
}

export const focusFirstInvalidField = createClientOnlyFn(() => {
  requestAnimationFrame(focusFirstRenderedInvalidField)
})
