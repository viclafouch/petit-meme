import { createFormHook } from '@tanstack/react-form'
import { CheckboxField } from '~/components/form/checkbox-field'
import { ClipboardPasteField } from '~/components/form/clipboard-paste-field'
import { FormFooter } from '~/components/form/form-footer'
import { TextField } from '~/components/form/text-field'
import { fieldContext, formContext } from '~/hooks/form-context'

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
