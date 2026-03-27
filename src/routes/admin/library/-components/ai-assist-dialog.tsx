import React from 'react'
import { Stars, X } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '~/components/ui/dialog'
import { Input } from '~/components/ui/input'
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
import { useMutation } from '@tanstack/react-query'

type AiAssistDialogParams = {
  memeId: Meme['id']
  contentLocale: MemeContentLocale
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onApply: (locale: Locale, result: AiAssistResult) => void
}

export const AiAssistDialog = ({
  memeId,
  contentLocale,
  isOpen,
  onOpenChange,
  onApply
}: AiAssistDialogParams) => {
  const [customPrompt, setCustomPrompt] = React.useState('')
  const [editedTitle, setEditedTitle] = React.useState('')
  const [editedDescription, setEditedDescription] = React.useState('')
  const [editedKeywords, setEditedKeywords] = React.useState<string[]>([])
  const [hasPreview, setHasPreview] = React.useState(false)

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
    onMutate: () => {
      setHasPreview(false)
    },
    onSuccess: (result) => {
      setEditedTitle(result.title)
      setEditedDescription(result.description)
      setEditedKeywords(result.keywords)
      setHasPreview(true)
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
      onApply(applyLocale, translated[applyLocale])
      handleOpenChange(false)
    },
    onError: (error) => {
      captureWithFeature(error, 'ai-translation')
      toast.error(getErrorMessage(error))
    }
  })

  const handleReset = () => {
    translateMutation.reset()
    setCustomPrompt('')
    setEditedTitle('')
    setEditedDescription('')
    setEditedKeywords([])
    setHasPreview(false)
    keywordsField.setKeywordValue('')
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      handleReset()
    }

    onOpenChange(open)
  }

  const handleApply = () => {
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

    onApply('fr', result)
    handleOpenChange(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-xl">
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
          {hasPreview ? (
            <div className="flex flex-col gap-4 border-t pt-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="ai-assist-title">Titre</Label>
                <Input
                  id="ai-assist-title"
                  type="text"
                  value={editedTitle}
                  onChange={(event) => {
                    setEditedTitle(event.target.value)
                  }}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="ai-assist-description">Description</Label>
                <Textarea
                  id="ai-assist-description"
                  value={editedDescription}
                  onChange={(event) => {
                    setEditedDescription(event.target.value)
                  }}
                />
                <span
                  className="self-end text-xs text-muted-foreground"
                  role="status"
                  aria-live="polite"
                >
                  {editedDescription.length}/200 caractères
                </span>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="ai-assist-keywords">
                  Mots-clés ({editedKeywords.length})
                </Label>
                <Input
                  id="ai-assist-keywords"
                  type="text"
                  placeholder="Ajouter un mot-clé..."
                  value={keywordsField.keywordValue}
                  onChange={(event) => {
                    keywordsField.setKeywordValue(event.target.value)
                  }}
                  enterKeyHint="done"
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      event.stopPropagation()
                      keywordsField.handleAddKeyword()
                    }
                  }}
                />
                {editedKeywords.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {editedKeywords.map((keyword, index) => {
                      return (
                        <Badge variant="secondary" key={keyword}>
                          {keyword}
                          <button
                            onClick={(event) => {
                              event.preventDefault()
                              event.stopPropagation()
                              keywordsField.handleRemoveKeyword(index)
                            }}
                            aria-label={`Supprimer le mot-clé "${keyword}"`}
                            type="button"
                            className="-m-1 flex cursor-pointer items-center rounded p-1.5 hover:bg-muted"
                          >
                            <X className="size-3" />
                          </button>
                        </Badge>
                      )
                    })}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
        {hasPreview ? (
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
