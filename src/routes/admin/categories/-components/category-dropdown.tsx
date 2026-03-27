import React from 'react'
import { EllipsisVertical } from 'lucide-react'
import { toast } from 'sonner'
import * as Sentry from '@sentry/tanstackstart-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { ConfirmAlertDialog } from '~/components/confirm-alert-dialog'
import { Button } from '~/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '~/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '~/components/ui/dropdown-menu'
import { getErrorMessage } from '~/helpers/error'
import { getCategoriesListQueryOpts } from '~/lib/queries'
import { CategoryForm } from '~/routes/admin/categories/-components/category-form'
import { deleteCategory, type EnrichedCategory } from '~/server/categories'

type CategoryDropdownProps = {
  category: EnrichedCategory
}

export const CategoryDropdown = ({ category }: CategoryDropdownProps) => {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false)

  const invalidateData = () => {
    void queryClient.invalidateQueries({
      queryKey: getCategoriesListQueryOpts.all
    })
    void router.invalidate()
  }

  const handleDeleteSuccess = () => {
    setIsDeleteDialogOpen(false)
    invalidateData()
  }

  const handleEditSuccess = () => {
    setIsEditDialogOpen(false)
    invalidateData()
  }

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const promise = deleteCategory({ data: category.id })
      toast.promise(promise, {
        loading: 'Suppression en cours...',
        success: 'Catégorie supprimée',
        error: getErrorMessage
      })

      return promise
    },
    onSuccess: handleDeleteSuccess,
    onError: (error) => {
      Sentry.captureException(error, {
        tags: { feature: 'admin-category-delete' }
      })
    }
  })

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="data-[state=open]:bg-muted text-muted-foreground flex size-9 float-right"
            size="icon"
          >
            <EllipsisVertical />
            <span className="sr-only">Actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-32">
          <DropdownMenuItem
            onSelect={() => {
              setIsEditDialogOpen(true)
            }}
          >
            Modifier
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => {
              setIsDeleteDialogOpen(true)
            }}
          >
            Supprimer
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmAlertDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false)
        }}
        title="Supprimer cette catégorie ?"
        description="Cette action est irréversible."
        actionLabel="Supprimer"
        onConfirm={() => {
          deleteMutation.mutate()
        }}
      />
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier une catégorie</DialogTitle>
            <DialogDescription className="sr-only">
              Modifier le titre, slug et mots-clés de la catégorie
            </DialogDescription>
          </DialogHeader>
          <CategoryForm
            type="edit"
            onClose={() => {
              setIsEditDialogOpen(false)
            }}
            category={category}
            onSuccess={handleEditSuccess}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}
