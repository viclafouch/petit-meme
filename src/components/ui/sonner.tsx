import type { ToasterProps } from 'sonner'
import { Toaster as Sonner } from 'sonner'
import { useSelector } from '@tanstack/react-store'
import { useThemeStore } from '~/stores/theme.store'

const Toaster = ({ ...props }: ToasterProps) => {
  const theme = useSelector(useThemeStore(), (state) => {
    return state.theme
  })

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)'
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
