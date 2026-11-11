import type React from 'react'
import type { MemeFullData } from '~/constants/meme'
import { getRequiredLocales } from '~/helpers/i18n-content'
import { MemeClassificationCard } from './meme-classification-card'
import { MemeContentCard } from './meme-content-card'
import { MemePageHeader } from './meme-page-header'
import { MemeStatusCard } from './meme-status-card'
import { MemeTranslationCard } from './meme-translation-card'
import { MemeVideoCard } from './meme-video-card'
import { useMemeAutosave } from './use-meme-autosave'
import { useMemeFill } from './use-meme-fill'
import { useMemeForm } from './use-meme-form'
import { useMemePublisher } from './use-meme-publisher'

const handleNativeSubmit = (event: React.SyntheticEvent<HTMLFormElement>) => {
  event.preventDefault()
}

type MemeEditorProps = {
  meme: MemeFullData
}

export const MemeEditor = ({ meme }: MemeEditorProps) => {
  const publisher = useMemePublisher(meme)
  const autosave = useMemeAutosave(meme)
  const {
    form,
    keywordsFields,
    categoriesListQuery,
    translateContentMutation,
    flushPendingKeywords
  } = useMemeForm({
    meme,
    onChange: autosave.schedule,
    onSubmit: publisher.publish
  })
  const memeFill = useMemeFill({
    memeId: meme.id,
    form,
    matchHasUnsavedEdits: () => {
      return autosave.matchHasUnsavedValues() || !form.state.isValid
    }
  })

  const handlePublish = () => {
    flushPendingKeywords()
    void form.handleSubmit()
  }

  return (
    <div className="flex flex-col gap-8">
      <MemePageHeader meme={meme} publisher={publisher} />
      <form
        noValidate
        className="grid gap-6 lg:grid-cols-meme-editor"
        onSubmit={handleNativeSubmit}
      >
        <form.Subscribe
          selector={(state) => {
            return state.values.contentLocale
          }}
          children={(contentLocale) => {
            const translationLocales = getRequiredLocales(contentLocale)
            const classificationIndex = translationLocales.length + 2

            return (
              <>
                <div className="flex min-w-0 flex-col gap-6 max-lg:order-2">
                  <MemeContentCard index={1} form={form} memeFill={memeFill} />
                  {translationLocales.map((locale, position) => {
                    return (
                      <MemeTranslationCard
                        key={locale}
                        index={position + 2}
                        form={form}
                        locale={locale}
                        keywordsField={keywordsFields[locale]}
                        isTranslateVisible={contentLocale === 'UNIVERSAL'}
                        isTranslating={
                          translateContentMutation.isPending
                            ? translateContentMutation.variables === locale
                            : false
                        }
                        onTranslate={() => {
                          translateContentMutation.mutate(locale)
                        }}
                      />
                    )
                  })}
                  <MemeClassificationCard
                    index={classificationIndex}
                    form={form}
                    categoriesQuery={categoriesListQuery}
                  />
                </div>
                <div className="flex flex-col gap-6 max-lg:contents">
                  <MemeVideoCard meme={meme} className="max-lg:order-1" />
                  <MemeStatusCard
                    index={classificationIndex + 1}
                    meme={meme}
                    publisher={publisher}
                    onPublish={handlePublish}
                    className="max-lg:order-3 lg:sticky lg:top-6"
                  />
                </div>
              </>
            )
          }}
        />
      </form>
    </div>
  )
}
