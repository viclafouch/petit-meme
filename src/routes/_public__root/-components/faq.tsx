import type { FaqItem } from '@/components/faq-section'
import { FaqSection } from '@/components/faq-section'

export const HOME_FAQ_ITEMS = [
  {
    question: `Qu'est-ce que Petit Mème ?`,
    answer: `Petit Mème est une bibliothèque en ligne qui rassemble les meilleurs mèmes vidéo du web. Tu peux les parcourir, les sauvegarder en favoris et les partager facilement avec tes amis.`
  },
  {
    question: `Est-ce que les vidéos sont gratuites ?`,
    answer: `Oui. L'accès aux vidéos mèmes est entièrement gratuit. Les fonctionnalités payantes concernent uniquement des services supplémentaires, comme le téléchargement sans watermark ou des options avancées de personnalisation.`
  },
  {
    question: `D'où viennent les vidéos ?`,
    answer: `Les vidéos proviennent d'Internet et des réseaux sociaux. Petit Mème ne détient pas les droits sur ces vidéos : elles sont mises à disposition uniquement pour le visionnage.`
  },
  {
    question: `Puis-je uploader mes propres mèmes ?`,
    answer: `Non, pas pour l'instant. Seul l'administrateur du site peut ajouter de nouveaux mèmes. Mais cette fonctionnalité pourrait évoluer à l'avenir.`
  },
  {
    question: `Que faire si une vidéo m'appartient ou si je veux qu'elle soit supprimée ?`,
    answer: `Si tu es propriétaire d'une vidéo et que tu souhaites son retrait, tu peux nous contacter directement par mail.`
  },
  {
    question: `Est-ce légal ?`,
    answer: `Petit Mème ne revend pas les vidéos et ne prétend pas en détenir les droits. L'accès est gratuit et destiné à un usage personnel, comme on le retrouve sur les réseaux sociaux. Les fonctionnalités premium concernent uniquement des services additionnels (favoris illimités, téléchargement sans watermark, etc.) et ne confèrent aucun droit commercial sur les vidéos.`
  }
] as const satisfies readonly FaqItem[]

type FaqParams = {
  heading?: string
}

export const Faq = ({ heading = 'Questions fréquentes' }: FaqParams) => {
  return <FaqSection items={HOME_FAQ_ITEMS} heading={heading} />
}
