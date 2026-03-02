// Token en memoria + sessionStorage para sobrevivir recargas de página
// sessionStorage se limpia al cerrar la pestaña/navegador
const SESSION_KEY = "authToken";

let _token: string | null = null;

export function setAuthToken(token: string) {
  _token = token;
  try {
    sessionStorage.setItem(SESSION_KEY, token);
  } catch {
    // ignore
  }
}

export function getAuthToken(): string | null {
  if (_token) return _token;
  try {
    const stored = sessionStorage.getItem(SESSION_KEY);
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
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}
