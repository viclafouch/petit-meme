import { Link } from '@tanstack/react-router'

export const Footer = () => {
  return (
    <footer className="border-t bg-background/40 relative">
      <div className="container py-6">
        <div className="flex items-center justify-center flex-wrap gap-x-8 gap-y-6">
          <Link
            to="/privacy"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Confidentialité
          </Link>
          <Link
            to="/terms-of-use"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Conditions
          </Link>
          <Link
            to="/mentions-legales"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Mentions légales
          </Link>
        </div>
      </div>
    </footer>
  )
}
