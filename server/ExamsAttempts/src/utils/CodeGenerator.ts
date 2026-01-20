export function generateAccessCode(): string {
  // Tomar los primeros 10 caracteres de un UUID sin guiones
  return crypto.randomUUID().replace(/-/g, '').substring(0, 10).toUpperCase();
}

export function generateSessionId(): string {
  return crypto.randomUUID().replace(/-/g, '').substring(0, 10).toUpperCase();
}