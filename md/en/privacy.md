# Privacy Policy - Petit Meme

Last updated: **February 2026**

This Privacy Policy describes how **Petit Meme**
(accessible at [https://petit-meme.io](https://petit-meme.io))
collects, uses and protects your personal data, in accordance with the
**General Data Protection Regulation (GDPR)**.

---

## 1. Data controller

The data controller is:

- **Petit Meme**
- Website: [https://petit-meme.io](https://petit-meme.io)
- Contact: [legal@petit-meme.io](mailto:legal@petit-meme.io)

When you create an account via Twitter/X, we collect your name, email address
and profile picture. By signing in, you accept this Privacy Policy.

---

## 2. Data collected

### 2.1. Account data

When creating an account, we collect:

- Username
- Email address
- Password (stored in hashed form)
- Twitter/X identifier (for social login)

### 2.2. Browsing and session data

- IP address (temporarily processed for security purposes)
- Authentication session data (session cookies)

### 2.3. View and interaction data

- Anonymous identifier (`anonId`) for unique view counting
  (cookie, only with your consent)
- Number of views and watch time for memes

### 2.4. Search and Algolia analytics data (with consent)

If you accept cookies, we send to Algolia:

- View events (memes viewed)
- Click events (memes clicked from search results)
- An anonymous identifier (`algoliaUserToken`) linking these events,
  with no connection to your personal identity

This data is used to improve search result relevance and generate
recommendations.

### 2.5. Studio generation data

When you use the Studio feature (generating images from memes), we record:

- The date and time of each generation
- The identifier of the meme used

This data is used for usage control (limiting the number of free generations)
and service improvement (aggregated usage statistics). It is retained for
**365 days**, then automatically deleted.

### 2.6. Payment data

Payments are handled by **Stripe**. We never store your credit card
information. Stripe collects the data necessary for payment processing in
accordance with its own privacy policy.

---

## 3. Purposes and legal bases

| Purpose | Legal basis | Data concerned |
|---------|------------|----------------|
| Account creation and management | Performance of contract | Username, email, password |
| Authentication and security | Legitimate interest | Session data, IP |
| View counting (with `anonId` cookie) | Consent | Anonymous identifier |
| Search improvement (Algolia Insights) | Consent | Anonymous identifier, view and click events |
| Payment processing | Performance of contract | Data transmitted to Stripe |
| Sending transactional emails | Performance of contract | Email address |
| Meme search | Performance of contract | Search queries |
| Usage control and Studio analytics | Legitimate interest | Generation date, meme identifier |
| Error tracking and service stability | Legitimate interest | Technical data (URL, browser, error traces) |

---

## 4. Cookies

### Cookie table

| Name | Purpose | Duration | Consent required |
|------|---------|----------|-----------------|
| `cookieConsent` | Remember your consent choice | 1 year | No (strictly necessary) |
| `better-auth.session_token` | Authentication session | Session duration | No (strictly necessary) |
| `theme` | Theme preference (light/dark) | 1 year | No (strictly necessary) |
| `PARAGLIDE_LOCALE` | Remember the chosen language (fr/en) | 1 year | No (strictly necessary) |
| `localeBannerDismissed` | Remember dismissal of the language suggestion banner | 1 year | No (strictly necessary) |
| `anonId` | Unique view counting | 1 year | Yes |
| `algoliaUserToken` | Linking search events (views, clicks) for Algolia | 1 year | Yes |

You can manage your cookie preferences at any time. If you decline analytics
cookies, the `anonId` and `algoliaUserToken` cookies will not be set. No events
will be sent to Algolia.

---

## 5. Sub-processors and recipients

We use the following sub-processors for the operation of the service:

| Sub-processor | Purpose | Location |
|---------------|---------|----------|
| **Stripe** | Payment processing | United States (standard contractual clauses) |
| **Resend** | Sending transactional emails | United States (standard contractual clauses) |
| **Bunny CDN** | Video hosting and delivery | European Union |
| **Algolia** | Search engine | European Union / United States (standard contractual clauses) |
| **Twitter/X** | Social authentication (OAuth) | United States (standard contractual clauses) |
| **Sentry** | Error tracking and stability monitoring | Germany (European Union) |
| **Google Fonts** | Loading display fonts (IP address transmitted) | United States (standard contractual clauses) |
| **Neon** | Database hosting | United States (standard contractual clauses) |
| **Vercel** | Application hosting and execution | United States (standard contractual clauses) |

For data transfers outside the European Union, appropriate safeguards are in
place (European Commission standard contractual clauses).

---

## 6. Data retention periods

| Data | Retention period |
|------|-----------------|
| Account data | Until account deletion by the user |
| Session data | Duration of active session (automatically deleted upon expiry) |
| Verification tokens | Automatically deleted 24 hours after expiry |
| Detailed view data (`MemeViewDaily`) | 90 days, then aggregated (global counter) and deleted |
| `anonId` cookie | 1 year (with consent) |
| `algoliaUserToken` cookie | 1 year (with consent) |
| Algolia event data (views, clicks) | Per Algolia's retention policy (30 days by default) |
| Studio generation data | 365 days, then automatically deleted |
| Administrative audit log data | 2 years, then automatically deleted |
| Payment data (Stripe) | Per Stripe's legal obligations |
| Transactional emails | Per Resend's retention policy |

An automated cleanup process runs once a week to delete expired sessions,
obsolete verification tokens and aggregate view data beyond 90 days.

Upon deletion of your account, your personal data is deleted within 30 days,
except for data we are required to retain under legal obligations.

---

## 7. Your rights

Under the GDPR, you have the following rights:

- **Right of access**: obtain a copy of your personal data
- **Right to rectification**: correct inaccurate or incomplete data
- **Right to erasure**: request the deletion of your data
- **Right to data portability**: receive your data in a structured,
  machine-readable format
- **Right to object**: object to the processing of your data based on
  legitimate interest
- **Right to withdraw consent**: withdraw your consent to analytics cookies
  at any time

To exercise your rights, contact us at:
[legal@petit-meme.io](mailto:legal@petit-meme.io)

We commit to responding to your request within one month.

---

## 8. Security

We implement appropriate technical and organizational measures to protect your
personal data:

- Encrypted communications (HTTPS/TLS)
- Password hashing
- Restricted access to personal data
- Secure hosting

---

## 9. Filing a complaint with the CNIL

If you believe that the processing of your personal data constitutes a
violation of the GDPR, you have the right to file a complaint with the
**Commission Nationale de l'Informatique et des Libertés (CNIL)**:

- Website: [https://www.cnil.fr](https://www.cnil.fr)
- Address: 3 Place de Fontenoy, TSA 80715, 75334 Paris Cedex 07

---

## 10. Changes to this policy

Petit Meme reserves the right to modify this Privacy Policy. In the event of a
substantial change, users will be informed via the website.

---

## 11. Contact

For any questions regarding this privacy policy:
[legal@petit-meme.io](mailto:legal@petit-meme.io)
