import React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Button } from '~/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '~/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import { invalidateAdminMemesOverview } from '~/queries/admin/meme'
import { FileForm } from '~/routes/admin/-components/file-form'
import { TwitterForm } from '~/routes/admin/-components/twitter-form'

type NewMemeButtonProps = Partial<React.ComponentProps<typeof Button>>

export const NewMemeButton = ({ ...restButtonProps }: NewMemeButtonProps) => {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = React.useState(false)

  const handleImported = async (memeId: string) => {
    await invalidateAdminMemesOverview(queryClient)
    await navigate({ to: '/admin/library/$memeId', params: { memeId } })
    setIsOpen(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger render={<Button {...restButtonProps} />} />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Importer un Meme</DialogTitle>
          <DialogDescription>
            Depuis un tweet ou un fichier. Tu le publies ensuite depuis sa page.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="tweet" className="w-full gap-4">
          <TabsList className="w-full">
            <TabsTrigger value="tweet">Lien X</TabsTrigger>
            <TabsTrigger value="file">Fichier</TabsTrigger>
          </TabsList>
          <TabsContent value="tweet">
            <TwitterForm onImported={handleImported} />
          </TabsContent>
          <TabsContent value="file">
            <FileForm onImported={handleImported} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
