import React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '~/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '~/components/ui/dialog'
import { getCategoriesListQueryOpts } from '~/lib/queries'
import { CategoryForm } from '~/routes/admin/categories/-components/category-form'

type AddCategoryButtonProps = Partial<React.ComponentProps<typeof Button>>

export const AddCategoryButton = ({
  ...restButtonProps
}: AddCategoryButtonProps) => {
  const [isOpen, setIsOpen] = React.useState(false)
  const queryClient = useQueryClient()

  const handleSuccess = () => {
    setIsOpen(false)

    return queryClient.invalidateQueries({
      queryKey: getCategoriesListQueryOpts.all
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger render={<Button {...restButtonProps} />} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter une catégorie</DialogTitle>
          <DialogDescription className="sr-only">
            Renseigner le titre, slug et mots-clés de la catégorie
          </DialogDescription>
        </DialogHeader>
        <CategoryForm type="add" onSuccess={handleSuccess} />
      </DialogContent>
    </Dialog>
  )
}
