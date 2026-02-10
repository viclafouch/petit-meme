# Plan — Audits codebase

Série d'audits à réaliser sur la codebase via les agents disponibles dans `.claude/agents/`.

## Audits à faire

- [ ] **Backend Performance** (`backend-performance`) — Auditer les server functions, requêtes Prisma et endpoints pour détecter les problèmes de performance (N+1 queries, boucles inefficaces, index manquants, fuites mémoire)
- [ ] **React Performance** (`react-performance`) — Auditer les composants React pour les re-renders inutiles, problèmes de stabilité de références, computations coûteuses, problèmes de useEffect et rendu de listes
- [ ] **Security** (`security-auditor`) — Auditer les vulnérabilités : authentification, injections, CSRF, XSS, exposition de secrets, OWASP Top 10
- [ ] **GDPR** (`gdpr-auditor`) — Auditer la conformité RGPD : gestion du consentement, rétention des données, droits utilisateurs (accès, rectification, effacement, portabilité), cookies, mentions légales
- [ ] **Dead Code** (`dead-code`) — Détecter et supprimer le code mort : exports, imports, fichiers, fonctions, variables, types inutilisés et packages npm orphelins
- [ ] **Duplicate Code** (`dedup-auditor`) — Détecter et éliminer les duplications de code : constantes, helpers, types et composants dupliqués
- [ ] **Tailwind CSS** (`tailwind-audit`) — Auditer les classes Tailwind : classes mortes, combinaisons redondantes, valeurs hardcodées, modernisation des patterns
- [ ] **Code Refactoring** (`code-refactoring`) — Passe de simplification et refactoring pour améliorer la clarté, la cohérence et la maintenabilité du code
