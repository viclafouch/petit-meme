import React from 'react'
import { EllipsisVertical } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import type { Category } from '@/db/generated/prisma/client'
import { getCategoriesListQueryOpts } from '@/lib/queries'
import { CategoryForm } from '@/routes/admin/categories/-components/category-form'
import { deleteCategory } from '@/server/categories'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'

export const CategoryDropdown = ({ category }: { category: Category }) => {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false)

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await deleteCategory({ data: category.id })
    },
    onError: (error) => {
      toast.error(error.message)
    },
    onSuccess: () => {
      void router.invalidate()
    }
  })

  const handleEditSuccess = () => {
    setIsEditDialogOpen(false)
    void queryClient.invalidateQueries({
      queryKey: getCategoriesListQueryOpts.all
    })
    void router.invalidate()
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="data-[state=open]:bg-muted text-muted-foreground flex size-8 float-right"
            size="icon"
          >
            <EllipsisVertical />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-32">
          <DropdownMenuItem
            onClick={() => {
              setIsEditDialogOpen(true)
            }}
          >
            Modifier
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onClick={() => {
              deleteMutation.mutate()
            }}
          >
            Supprimer
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier une catégorie</DialogTitle>
            <DialogDescription />
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
