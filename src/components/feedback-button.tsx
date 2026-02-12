import React from 'react'
import { motion } from 'framer-motion'
import { Lightbulb } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/lib/theme'
import { useRouteContext } from '@tanstack/react-router'

const PROJECT_ID = 'cmfkxs01n00y0pa15s2ep13b3'

export const FeedbackButton = () => {
  const { theme } = useTheme()
  const { user } = useRouteContext({ from: '__root__' })

  React.useEffect(() => {
    window.uj.init(PROJECT_ID, {
      widget: true,
      position: 'right',
      theme: 'auto',
      trigger: 'custom'
    })
  }, [])

  React.useEffect(() => {
    if (user) {
      window.uj.identify({
        id: user.id,
        email: user.email,
        firstName: user.name,
        avatar: 'https://bundui-images.netlify.app/avatars/01.png'
      })
    } else {
      window.uj.identify(null)
    }
  }, [user])

  React.useEffect(() => {
    window.uj.setTheme(theme)
  }, [theme])

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()

    window.uj.showWidget({ section: 'feedback' })
  }

  return (
    <motion.div
      className="fixed bottom-2 right-4 z-50 sm:bottom-6 sm:right-6"
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{ transformOrigin: 'bottom right' }}
      transition={{ delay: 1 }}
    >
      <Button
        variant="default"
        size="default"
        onClick={handleClick}
        className="shadow-lg hover:shadow-xl transition-shadow animate-bounce-subtle cursor-pointer max-sm:rounded-full max-sm:aspect-square max-sm:size-12"
      >
        <Lightbulb className="fill-amber-300 size-5" />
        <span className="hidden sm:inline">Feedback ?</span>
      </Button>
    </motion.div>
  )
}
