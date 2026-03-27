import React from 'react'
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
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'

import { FileForm } from '~admin/-components/file-form'
import { TwitterForm } from '~admin/-components/twitter-form'
import {
  getAdminDashboardTotalsQueryOpts,
  getAdminMemesListQueryOpts
} from '~admin/-lib/queries'

type NewMemeButtonProps = Partial<React.ComponentProps<typeof Button>>

export const NewMemeButton = ({ ...restButtonProps }: NewMemeButtonProps) => {
  const queryClient = useQueryClient()
  const [isOpen, setIsOpen] = React.useState(false)
  const navigate = useNavigate()

  const closeDialog = () => {
    setIsOpen(false)
  }

  const handleAddMeme = ({ memeId }: { memeId: string }) => {
    void queryClient.invalidateQueries({
      queryKey: getAdminMemesListQueryOpts.all,
      exact: false
    })
    void queryClient.invalidateQueries({
      queryKey: getAdminDashboardTotalsQueryOpts.all
    })
    void navigate({ to: '/admin/library/$memeId', params: { memeId } })
    closeDialog()
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button {...restButtonProps} />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter un mème</DialogTitle>
          <DialogDescription className="sr-only">
            Ajouter un mème depuis Twitter ou un fichier local
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="twitter" className="w-full gap-4">
          <TabsList>
            <TabsTrigger value="twitter">Twitter</TabsTrigger>
            <TabsTrigger value="local">Fichier local</TabsTrigger>
          </TabsList>
          <TabsContent value="twitter">
            <TwitterForm onSuccess={handleAddMeme} closeDialog={closeDialog} />
          </TabsContent>
          <TabsContent value="local">
            <FileForm onSuccess={handleAddMeme} closeDialog={closeDialog} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
