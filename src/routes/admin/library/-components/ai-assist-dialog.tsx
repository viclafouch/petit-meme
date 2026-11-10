import React from 'react'
import { Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { useMutation } from '@tanstack/react-query'
import { Button } from '~/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '~/components/ui/dialog'
import { Label } from '~/components/ui/label'
import { LoadingButton } from '~/components/ui/loading-button'
import { Textarea } from '~/components/ui/textarea'
import { MEME_FILL_CUSTOM_PROMPT_MAX_LENGTH } from '~/constants/meme-fill'
import type { MemeFillSuggestion } from '~/constants/meme-fill-suggestion'
import type { MemeContentLocale } from '~/db/generated/prisma/enums'
import { getErrorMessage } from '~/helpers/error'
import { CONTENT_LOCALE_TO_LOCALE } from '~/helpers/i18n-content'
import { parseKeywordsInput } from '~/helpers/keywords'
import { useKeywordsField } from '~/hooks/use-keywords-field'
import { isLocale, type Locale } from '~/paraglide/runtime'
import { type AiAssistResult, translateMemeContent } from '~/server/ai'
import { removeDuplicates } from '~/utils/array'
import { AiAssistPreview } from './ai-assist-preview'

export type AiAssistFieldSelection = {
  title: boolean
  description: boolean
  keywords: boolean
}

const DEFAULT_FIELD_SELECTION: AiAssistFieldSelection = {
  title: true,
  description: true,
  keywords: true
}

type AiAssistStartDialogProps = {
  isOpen: boolean
  isStarting: boolean
  onOpenChange: (open: boolean) => void
  onStart: (customPrompt: string, onStarted: () => void) => void
}

export const AiAssistStartDialog = ({
  isOpen,
  isStarting,
  onOpenChange,
  onStart
}: AiAssistStartDialogProps) => {
  const [customPrompt, setCustomPrompt] = React.useState('')

  const handleStart = () => {
    onStart(customPrompt, () => {
      setCustomPrompt('')
      onOpenChange(false)
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-5" aria-hidden />
            AI Assist
          </DialogTitle>
          <DialogDescription>
            L’IA regarde la vidéo et écrit le titre, la description, les
            mots-clés et les traductions. Vous pouvez quitter la page pendant
            l’analyse.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Label htmlFor="ai-assist-prompt">Contexte (optionnel)</Label>
          <Textarea
            id="ai-assist-prompt"
            className="field-sizing-content"
            placeholder="Ex: C'est le mème du chat qui regarde la caméra..."
            rows={2}
            maxLength={MEME_FILL_CUSTOM_PROMPT_MAX_LENGTH}
            value={customPrompt}
            onChange={(event) => {
              setCustomPrompt(event.target.value)
            }}
          />
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onOpenChange(false)
            }}
          >
            Annuler
          </Button>
          <LoadingButton
            type="button"
            isLoading={isStarting}
            loadingText="Lancement..."
            onClick={handleStart}
          >
            <Sparkles aria-hidden />
            Lancer l’analyse
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const resolveSuggestionLocale = (
  suggestion: MemeFillSuggestion,
  applyLocale: Locale
) => {
  if (suggestion[applyLocale]) {
    return applyLocale
  }

  return Object.keys(suggestion).find(isLocale) ?? null
}

type AiAssistReviewFormProps = {
  suggestion: MemeFillSuggestion
  contentLocale: MemeContentLocale
  currentValues: AiAssistResult
  isSettling: boolean
  onApply: (
    locale: Locale,
    result: AiAssistResult,
    selectedFields: AiAssistFieldSelection
  ) => void
  onSettle: (isApplied: boolean) => void
  onClose: () => void
}

const AiAssistReviewForm = ({
  suggestion,
  contentLocale,
  currentValues,
  isSettling,
  onApply,
  onSettle,
  onClose
}: AiAssistReviewFormProps) => {
  const applyLocale = CONTENT_LOCALE_TO_LOCALE[contentLocale]
  const sourceLocale = resolveSuggestionLocale(suggestion, applyLocale)
  const source = sourceLocale ? suggestion[sourceLocale] : undefined
  const [editedTitle, setEditedTitle] = React.useState(source?.title ?? '')
  const [editedDescription, setEditedDescription] = React.useState(
    source?.description ?? ''
  )
  const [editedKeywords, setEditedKeywords] = React.useState(
    source?.keywords ?? []
  )
  const [selectedFields, setSelectedFields] = React.useState(
    DEFAULT_FIELD_SELECTION
  )
  const keywordsField = useKeywordsField({
    setKeywordsValue: setEditedKeywords
  })
  const isTranslationNeeded = sourceLocale !== applyLocale

  const applyAndClose = (result: AiAssistResult) => {
    onApply(applyLocale, result, selectedFields)
    onSettle(true)
    onClose()
  }

  const translateMutation = useMutation({
    mutationKey: ['ai-assist-translate', applyLocale],
    mutationFn: (result: AiAssistResult) => {
      return translateMemeContent({
        data: {
          sourceLocale: sourceLocale ?? applyLocale,
          targetLocales: [applyLocale],
          title: result.title,
          description: result.description,
          keywords: result.keywords
        }
      })
    },
    onSuccess: (translated) => {
      applyAndClose(translated[applyLocale])
    },
    onError: (error) => {
      toast.error(getErrorMessage(error))
    }
  })

  const handleToggleField = (field: keyof AiAssistFieldSelection) => {
    setSelectedFields((previous) => {
      return { ...previous, [field]: !previous[field] }
    })
  }

  const handleApply = () => {
    if (
      !selectedFields.title &&
      !selectedFields.description &&
      !selectedFields.keywords
    ) {
      toast.warning('Sélectionnez au moins un champ à appliquer.')

      return
    }

    const pendingKeywords = parseKeywordsInput(keywordsField.keywordValue)
    const result = {
      title: editedTitle,
      description: editedDescription,
      keywords: removeDuplicates([...editedKeywords, ...pendingKeywords])
    }

    if (isTranslationNeeded) {
      translateMutation.mutate(result)

      return
    }

    applyAndClose(result)
  }

  return (
    <>
      <AiAssistPreview
        currentValues={currentValues}
        selectedFields={selectedFields}
        editedTitle={editedTitle}
        editedDescription={editedDescription}
        editedKeywords={editedKeywords}
        keywordsField={keywordsField}
        onToggleField={handleToggleField}
        onTitleChange={setEditedTitle}
        onDescriptionChange={setEditedDescription}
      />
      <DialogFooter>
        <LoadingButton
          type="button"
          variant="outline"
          isLoading={isSettling}
          disabled={translateMutation.isPending}
          onClick={() => {
            onSettle(false)
            onClose()
          }}
        >
          Ignorer
        </LoadingButton>
        <LoadingButton
          type="button"
          isLoading={translateMutation.isPending}
          loadingText="Traduction en cours..."
          onClick={handleApply}
        >
          {isTranslationNeeded ? 'Appliquer et traduire' : 'Appliquer'}
        </LoadingButton>
      </DialogFooter>
    </>
  )
}

type AiAssistReviewDialogProps = Omit<AiAssistReviewFormProps, 'onClose'> & {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

export const AiAssistReviewDialog = ({
  isOpen,
  onOpenChange,
  ...formProps
}: AiAssistReviewDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-dialog overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-5" aria-hidden />
            Proposition de l’IA
          </DialogTitle>
          <DialogDescription>
            Choisissez les champs à reprendre. Le formulaire garde le reste.
          </DialogDescription>
        </DialogHeader>
        <AiAssistReviewForm
          {...formProps}
          onClose={() => {
            onOpenChange(false)
          }}
        />
      </DialogContent>
    </Dialog>
  )
}
