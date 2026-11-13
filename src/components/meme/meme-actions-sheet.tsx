import React from 'react'
import { ArrowRight, ChevronRight, Clapperboard, Star } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { MemeExportFormatTiles } from '~/components/meme/meme-export-menu'
import {
  MEME_EXPORT_MODE_DISPLAY,
  SHEET_BODY_CLASS_NAME,
  SHEET_GROUP_CLASS_NAME,
  SHEET_HEADER_CLASS_NAME,
  SHEET_ROW_CLASS_NAME,
  SHEET_TITLE_CLASS_NAME
} from '~/components/meme/meme-sheet'
import { useBookmarkAction } from '~/components/meme/use-bookmark-action'
import { useIsPremium } from '~/components/premium/use-is-premium'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger
} from '~/components/ui/drawer'
import type { MemeDerivedFormat } from '~/constants/bunny'
import type { MemeExportMode, MemeWithVideo } from '~/constants/meme'
import { useActionAfterClose } from '~/hooks/use-action-after-close'
import { cn } from '~/lib/utils'
import { m } from '~/paraglide/messages'

type MemeActionsSheetProps = {
  meme: MemeWithVideo
  render: React.ReactElement
  children: React.ReactNode
  onStudioOpen: () => void
  onExport: (mode: MemeExportMode, format: MemeDerivedFormat) => void
  queryID?: string
  authenticatedUserToken?: string
}

export const MemeActionsSheet = ({
  meme,
  render,
  children,
  onStudioOpen,
  onExport,
  queryID,
  authenticatedUserToken
}: MemeActionsSheetProps) => {
  const [isOpen, setIsOpen] = React.useState(false)
  const isPremium = useIsPremium()
  const { runAfterClose, handleOpenChangeComplete } = useActionAfterClose()
  const bookmarkAction = useBookmarkAction({
    meme,
    queryID,
    authenticatedUserToken
  })

  return (
    <Drawer
      open={isOpen}
      onOpenChange={setIsOpen}
      showSwipeHandle
      onOpenChangeComplete={handleOpenChangeComplete}
    >
      <DrawerTrigger render={render}>{children}</DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className={SHEET_HEADER_CLASS_NAME}>
          <DrawerTitle className={cn(SHEET_TITLE_CLASS_NAME, 'line-clamp-2')}>
            {meme.title}
          </DrawerTitle>
        </DrawerHeader>
        <div className={SHEET_BODY_CLASS_NAME}>
          <div className={SHEET_GROUP_CLASS_NAME}>
            {(['share', 'download'] as const).map((mode) => {
              const { icon: ModeIcon, label } = MEME_EXPORT_MODE_DISPLAY[mode]

              return (
                <Drawer key={mode} showSwipeHandle>
                  <DrawerTrigger className={SHEET_ROW_CLASS_NAME}>
                    <ModeIcon />
                    {label()}
                    <ChevronRight className="ml-auto text-muted-foreground" />
                  </DrawerTrigger>
                  <DrawerContent>
                    <DrawerHeader className={SHEET_HEADER_CLASS_NAME}>
                      <DrawerTitle className={SHEET_TITLE_CLASS_NAME}>
                        {label()}
                      </DrawerTitle>
                      <DrawerDescription className="line-clamp-1">
                        {meme.title}
                      </DrawerDescription>
                    </DrawerHeader>
                    <div className={SHEET_BODY_CLASS_NAME}>
                      <MemeExportFormatTiles
                        onSelect={(format) => {
                          if (isPremium) {
                            onExport(mode, format)
                          } else {
                            runAfterClose(() => {
                              onExport(mode, format)
                            })
                          }

                          setIsOpen(false)
                        }}
                      />
                    </div>
                  </DrawerContent>
                </Drawer>
              )
            })}
          </div>
          <div className={SHEET_GROUP_CLASS_NAME}>
            <DrawerClose
              disabled={bookmarkAction.isPending}
              className={SHEET_ROW_CLASS_NAME}
              onClick={() => {
                runAfterClose(bookmarkAction.selectBookmark)
              }}
            >
              <Star
                data-active={bookmarkAction.isMemeBookmarked}
                className="data-[active=true]:fill-current"
              />
              {bookmarkAction.label}
            </DrawerClose>
            <DrawerClose
              render={
                <Link to="/memes/$memeId/studio" params={{ memeId: meme.id }} />
              }
              className={SHEET_ROW_CLASS_NAME}
              onClick={onStudioOpen}
            >
              <Clapperboard />
              {m.meme_open_studio()}
            </DrawerClose>
            <DrawerClose
              render={<Link to="/memes/$memeId" params={{ memeId: meme.id }} />}
              className={SHEET_ROW_CLASS_NAME}
            >
              <ArrowRight />
              {m.meme_details()}
            </DrawerClose>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
