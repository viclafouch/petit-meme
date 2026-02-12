import { Link } from '@tanstack/react-router'

export const Footer = () => {
  return (
    <footer className="border-t bg-background/40 relative">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-center flex-wrap gap-x-8 gap-y-6">
          <a
            href="https://petit-meme.userjot.com"
            target="_blank"
            rel="noreferrer"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Contact & Support
          </a>
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
        </div>
      </div>
    </footer>
  )
}
