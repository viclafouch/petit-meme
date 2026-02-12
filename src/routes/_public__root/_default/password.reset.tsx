import { ResetPasswordForm } from '@/components/User/reset-password-form'
import { createFileRoute } from '@tanstack/react-router'

const RouteComponent = () => {
  return (
    <div className="flex justify-center w-full sm:py-20">
      <div className="border-muted bg-background flex sm:max-w-md flex-col items-center gap-y-4 rounded-md border px-6 py-8 shadow-md w-full">
        <ResetPasswordForm />
      </div>
    </div>
  )
}

export const Route = createFileRoute('/_public__root/_default/password/reset')({
  component: RouteComponent,
  head: () => {
    return {
      meta: [
        { title: 'Petit Meme - Réinitialiser le mot de passe' },
        { name: 'robots', content: 'noindex,nofollow' }
      ]
    }
  }
})
