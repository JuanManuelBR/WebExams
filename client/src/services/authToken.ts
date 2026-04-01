// Token en memoria + localStorage para sobrevivir recargas, cierre de pestaña y reinicio del navegador
const STORAGE_KEY = "authToken";

let _token: string | null = null;

export function setAuthToken(token: string) {
  _token = token;
  try {
    localStorage.setItem(STORAGE_KEY, token);
  } catch {
    // ignore
  }
}

export function getAuthToken(): string | null {
  if (_token) return _token;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      _token = stored;
      return _token;
    }
  } catch {
    // ignore
  }
  return null;
}

export function clearAuthToken() {
  _token = null;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
