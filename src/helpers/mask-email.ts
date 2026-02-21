export const maskEmail = (email: string) => {
  const [local, domain] = email.split('@')

  if (!local || !domain) {
    return email
  }

  return `${local[0]}***@${domain}`
}
