import { buttonVariants } from '@/components/ui/button'

export const NotFound = () => {
  return (
    <div className="flex items-center px-4 py-12 sm:px-6 md:px-8 lg:px-12 xl:px-16">
      <title>Petit Meme - Page introuvable</title>
      <meta name="robots" content="noindex,nofollow" />
      <div className="w-full space-y-6 text-center">
        <div className="space-y-3">
          <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl">
            404
          </h1>
          <p className="text-muted-foreground">
            On dirait que vous vous êtes aventuré dans le domaine inconnu du
            numérique.
          </p>
        </div>
        <a href="/" className={buttonVariants({ variant: 'default' })}>
          Retourner au site web
        </a>
      </div>
    </div>
  )
}
