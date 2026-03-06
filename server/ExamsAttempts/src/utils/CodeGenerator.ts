const CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const CODE_LENGTH = 4;

function randomCode(): string {
  const bytes = new Uint8Array(CODE_LENGTH);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => CHARSET[b % CHARSET.length])
    .join("");
}

export function generateAccessCode(): string {
  return randomCode();
}

export function generateSessionId(): string {
  return crypto.randomUUID().replace(/-/g, "").substring(0, 10);
}
