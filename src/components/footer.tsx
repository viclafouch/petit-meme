import { getLegalLinks } from '@/constants/navigation'
import { Link } from '@tanstack/react-router'

export const Footer = () => {
  return (
    <footer className="border-t bg-background/40 relative">
      <div className="container py-6">
        <div className="flex items-center justify-center flex-wrap gap-x-8 gap-y-6">
          {getLegalLinks().map((link) => {
            return (
              <Link
                key={link.to}
                to={link.to}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </Link>
            )
          })}
        </div>
      </div>
    </footer>
  )
}
