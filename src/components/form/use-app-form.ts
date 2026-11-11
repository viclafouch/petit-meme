import { createFormHook } from '@tanstack/react-form'
import { CheckboxField } from '~/components/form/checkbox-field'
import { ClipboardPasteField } from '~/components/form/clipboard-paste-field'
import { fieldContext, formContext } from '~/components/form/form-context'
import { FormFooter } from '~/components/form/form-footer'
import { TextField } from '~/components/form/text-field'

export const { useAppForm } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: {
    TextField,
    ClipboardPasteField,
    CheckboxField
  },
  formComponents: {
    FormFooter
  }
})
