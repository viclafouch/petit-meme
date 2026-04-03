import React from 'react'
import { Stars } from 'lucide-react'
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
import type { Meme } from '~/db/generated/prisma/client'
import type { MemeContentLocale } from '~/db/generated/prisma/enums'
import { getErrorMessage } from '~/helpers/error'
import { CONTENT_LOCALE_TO_LOCALE } from '~/helpers/i18n-content'
import { parseKeywordsInput } from '~/helpers/keywords'
import { useKeywordsField } from '~/hooks/use-keywords-field'
import { captureWithFeature } from '~/lib/sentry'
import type { Locale } from '~/paraglide/runtime'
import {
  aiAssistMemeContent,
  type AiAssistResult,
  translateMemeContent
} from '~/server/ai'
import { removeDuplicates } from '~/utils/array'
import { AiAssistPreview } from './ai-assist-preview'

export type AiAssistFieldSelection = {
  title: boolean
  description: boolean
  keywords: boolean
}

type AiAssistDialogParams = {
  memeId: Meme['id']
  contentLocale: MemeContentLocale
  currentValues: AiAssistResult
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onApply: (
    locale: Locale,
    result: AiAssistResult,
    selectedFields: AiAssistFieldSelection
  ) => void
}

const DEFAULT_FIELD_SELECTION: AiAssistFieldSelection = {
  title: true,
  description: true,
  keywords: true
}

export const AiAssistDialog = ({
  memeId,
  contentLocale,
  currentValues,
  isOpen,
  onOpenChange,
  onApply
}: AiAssistDialogParams) => {
  const [customPrompt, setCustomPrompt] = React.useState('')
  const [editedTitle, setEditedTitle] = React.useState('')
  const [editedDescription, setEditedDescription] = React.useState('')
  const [editedKeywords, setEditedKeywords] = React.useState<string[]>([])
  const [selectedFields, setSelectedFields] = React.useState(
    DEFAULT_FIELD_SELECTION
  )

  const keywordsField = useKeywordsField({
    setKeywordsValue: setEditedKeywords
  })

  const analysisMutation = useMutation({
    mutationKey: ['ai-assist', memeId],
    mutationFn: () => {
      return aiAssistMemeContent({
        data: {
          memeId,
          customPrompt,
          targetLocale: 'fr'
        }
      })
    },
    onSuccess: (result) => {
      setEditedTitle(result.title)
      setEditedDescription(result.description)
      setEditedKeywords(result.keywords)
      keywordsField.setKeywordValue('')
    },
    onError: (error) => {
      captureWithFeature(error, 'ai-generation')
      toast.error(getErrorMessage(error))
    }
  })

  const applyLocale = CONTENT_LOCALE_TO_LOCALE[contentLocale]
  const isTranslationNeeded = applyLocale !== 'fr'

  const translateMutation = useMutation({
    mutationKey: ['ai-assist-translate', memeId],
    mutationFn: (result: AiAssistResult) => {
      return translateMemeContent({
        data: {
          sourceLocale: 'fr',
          targetLocales: [applyLocale],
          title: result.title,
          description: result.description,
          keywords: result.keywords
        }
      })
    },
    onSuccess: (translated) => {
      onApply(applyLocale, translated[applyLocale], selectedFields)
      handleOpenChange(false)
    },
    onError: (error) => {
      captureWithFeature(error, 'ai-translation')
      toast.error(getErrorMessage(error))
    }
  })

  const handleToggleField = (field: keyof AiAssistFieldSelection) => {
    setSelectedFields((prev) => {
      return { ...prev, [field]: !prev[field] }
    })
  }

  const handleReset = () => {
    translateMutation.reset()
    setCustomPrompt('')
    setEditedTitle('')
    setEditedDescription('')
    setEditedKeywords([])
    analysisMutation.reset()
    setSelectedFields(DEFAULT_FIELD_SELECTION)
    keywordsField.setKeywordValue('')
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      handleReset()
    }

    onOpenChange(open)
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

    onApply('fr', result, selectedFields)
    handleOpenChange(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Stars className="size-5" aria-hidden />
            AI Assist
          </DialogTitle>
          <DialogDescription>
            Analysez la vidéo et générez titre, description et mots-clés.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="ai-assist-prompt">Contexte (optionnel)</Label>
            <Textarea
              id="ai-assist-prompt"
              className="field-sizing-content"
              placeholder="Ex: C'est le mème du chat qui regarde la caméra..."
              rows={2}
              value={customPrompt}
              onChange={(event) => {
                setCustomPrompt(event.target.value)
              }}
            />
            <div className="flex items-center gap-2 self-end">
              {analysisMutation.isPending ? (
                <Button
                  size="sm"
                  type="button"
                  variant="destructive"
                  onClick={() => {
                    analysisMutation.reset()
                  }}
                >
                  Arrêter
                </Button>
              ) : null}
              <LoadingButton
                isLoading={analysisMutation.isPending}
                loadingText="Analyse en cours..."
                size="sm"
                type="button"
                onClick={() => {
                  analysisMutation.mutate()
                }}
              >
                <Stars aria-hidden />
                Analyser
              </LoadingButton>
            </div>
          </div>
          {analysisMutation.isSuccess ? (
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
          ) : null}
        </div>
        {analysisMutation.isSuccess ? (
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={translateMutation.isPending}
              onClick={() => {
                handleOpenChange(false)
              }}
            >
              Annuler
            </Button>
            <LoadingButton
              type="button"
              isLoading={translateMutation.isPending}
              loadingText="Traduction en cours..."
              onClick={handleApply}
            >
              {isTranslationNeeded ? 'Appliquer et Traduire' : 'Appliquer'}
            </LoadingButton>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
