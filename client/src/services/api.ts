import axios from "axios";
import { setAuthToken, clearAuthToken } from "./authToken";

// Detecta automático: dev = proxy, prod = Railway
const isDev = import.meta.env.DEV;

const USERS_BASE = isDev
  ? "/api/users" // Proxy Vite local
  : `${import.meta.env.VITE_USERS_BASE}/api/users`;

export const usersApi = axios.create({
  baseURL: USERS_BASE,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
  timeout: 10000,
});

const ATTEMPTS_BASE = import.meta.env.VITE_ATTEMPTS_BASE;

export const examsAttemptsApi = axios.create({
  baseURL: ATTEMPTS_BASE ? `${ATTEMPTS_BASE}/api/exam` : "/api/exam",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
  timeout: 10000,
});

// Deduplica refrescos concurrentes: si ya hay uno en curso, todos esperan el mismo
let _refreshPromise: Promise<string | null> | null = null;

async function tryRefreshGoogleToken(): Promise<string | null> {
  if (_refreshPromise) return _refreshPromise;

  _refreshPromise = (async (): Promise<string | null> => {
    try {
      const usuarioStr = localStorage.getItem("usuario");
      if (!usuarioStr) return null;
      const usuario = JSON.parse(usuarioStr);
      if (usuario.loginMethod !== "google") return null;

      const { getApps, getAuth } = await import("firebase/auth");
      const apps = getApps();
      if (!apps.length) return null;

      const firebaseUser = getAuth(apps[0]).currentUser;
      if (!firebaseUser) return null;

      // Forzar refresco del token de Firebase
      const idToken = await firebaseUser.getIdToken(true);

      // Llamada directa con axios (no usersApi) para evitar loops en interceptores
      const response = await axios.post(
        `${USERS_BASE}/login-google`,
        { firebaseIdToken: idToken },
        { withCredentials: true },
      );

      if (response.data?.token) {
        setAuthToken(response.data.token);
        return response.data.token;
      }
      return null;
    } catch {
      return null;
    } finally {
      _refreshPromise = null;
    }
  })();

  return _refreshPromise;
}

// Interceptores globales
[usersApi, examsAttemptsApi].forEach((api) => {
  api.interceptors.request.use(
    (config) => config,
    (error) => {
      console.error("❌ Request Error:", error);
      return Promise.reject(error);
    },
  );

  api.interceptors.response.use(
    (response) => response,
    async (error) => {
      console.error(
        "❌ Response Error:",
        error.response?.status,
        error.config?.url,
      );

      if (error.response?.status === 401 || error.response?.status === 403) {
        // Intentar refrescar token de Google antes de cerrar sesión
        if (!(error.config as any)?._retry) {
          const newToken = await tryRefreshGoogleToken();
          if (newToken) {
            (error.config as any)._retry = true;
            return api(error.config);
          }
        }

        // No se pudo refrescar — cerrar sesión
        clearAuthToken();
        localStorage.removeItem("usuario");

        const currentPath = window.location.pathname;
        if (
          !currentPath.includes("/login") &&
          !currentPath.includes("/register")
        ) {
          window.location.href = "/login";
        }
      }

      return Promise.reject(error);
    },
  );
});
