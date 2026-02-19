// Token en memoria - no en localStorage ni cookie
// Se pierde al recargar (Firebase restaura la sesión automáticamente)
let _token: string | null = null;

export function setAuthToken(token: string) {
  _token = token;
}

export function getAuthToken(): string | null {
  return _token;
}

export function clearAuthToken() {
  _token = null;
}
