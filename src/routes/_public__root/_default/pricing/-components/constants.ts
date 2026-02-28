import type React from 'react'
import { Lock, MousePointerClick, ShieldCheck } from 'lucide-react'
import type { FaqItem } from '@/components/faq-section'

export const PRICING_FAQ_ITEMS = [
  {
    question: 'Puis-je annuler à tout moment ?',
    answer:
      'Oui, tu peux annuler ton abonnement en un clic depuis tes paramètres. Tu conserves l’accès Premium jusqu’à la fin de la période payée, sans frais cachés.'
  },
  {
    question: 'Comment fonctionne la génération de vidéos ?',
    answer:
      'Tu choisis un mème, tu ajoutes ton texte personnalisé et la vidéo est générée automatiquement. Les utilisateurs gratuits ont 3 générations, les Premium en ont à volonté.'
  },
  {
    question: 'Est-ce que mes données sont sécurisées ?',
    answer:
      'Absolument. Les paiements sont gérés par Stripe, le leader mondial du paiement en ligne. Nous ne stockons aucune donnée bancaire. Tes données personnelles sont protégées conformément au RGPD.'
  },
  {
    question: 'Comment passer au plan annuel ?',
    answer:
      'Sélectionne simplement "Annuel" dans le toggle ci-dessus et clique sur "Passer à Premium". Si tu es déjà abonné au mois, tu peux gérer ton abonnement depuis tes paramètres.'
  }
] as const satisfies readonly FaqItem[]

type StatItem = {
  value: string
  label: string
}

export const STAT_ITEMS = [
  { value: '500+', label: 'mèmes disponibles' },
  { value: '10 000+', label: 'vidéos générées' },
  { value: '1 000+', label: 'utilisateurs' }
] as const satisfies readonly StatItem[]

type GuaranteeItem = {
  icon: React.ElementType
  label: string
}

export const GUARANTEE_ITEMS = [
  { icon: Lock, label: 'Sans engagement' },
  { icon: MousePointerClick, label: 'Annulation en 1 clic' },
  { icon: ShieldCheck, label: 'Paiement sécurisé Stripe' }
] as const satisfies readonly GuaranteeItem[]
