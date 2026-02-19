# Plan — Items restants

**L'app est en production avec des utilisateurs et des données réelles.** Toute migration Prisma doit être additive (nouveaux champs optionnels, nouveaux index). Ne jamais supprimer/renommer de colonnes, reset la base, ou faire de migration destructive.

---

## GDPR

### MEDIUM

- [ ] Ajouter l'édition de profil (nom, email avec re-vérification) — Art. 16 droit de rectification (`src/routes/_public__root/_default/settings/`)
- [ ] Vérifier et documenter les DPA signés avec chaque sous-traitant (Stripe, Resend, Bunny, Algolia, Mixpanel, Railway) — Art. 28

### LOW

- [ ] Auto-héberger Google Fonts (Bricolage Grotesque) — tribunal de Munich 2022, IP envoyée à Google sans consentement (`src/routes/__root.tsx`)
- [ ] Activer les adresses email de contact (hello@petit-meme.io, legal@petit-meme.io)
- [ ] Ajouter un audit log pour l'export de données utilisateur

---

## Futur

Items non planifiés, à traiter après les corrections ci-dessus.

### Internationalisation (FR / EN)

Passer le site en bilingue français / anglais. Étudier la meilleure approche avec TanStack Start (routing i18n, détection de langue, etc.).

### Migration Prisma → Drizzle

Remplacer Prisma par Drizzle ORM. Conventions cibles : tables en pluriel, colonnes en `snake_case`, timestamps `_at`, booleans `is_*`, prix en centimes (integer), UUIDs partout, `ON DELETE CASCADE` pour auth, `is_anonymized` pour GDPR.

### Stripe — Payment Elements

Évaluer la migration vers Payment Elements (au lieu de Checkout redirect). Pattern : `PaymentIntent` → `confirmPayment` avec `redirect: 'if_required'` → polling post-paiement.
