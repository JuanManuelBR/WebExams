import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Moon, Sun, ChevronLeft } from 'lucide-react';
import logoUniversidad from '../../assets/logo-universidad.webp';
import logoUniversidadNoche from '../../assets/logo-universidad-noche.webp';
import fondoImagen from '../../assets/fondo.webp';
import { authService } from '../services/authService';

// Importa Firebase
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth';

// ============================================
// CONFIGURACIÓN DE FIREBASE (con manejo seguro de errores)
// ============================================
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Inicializar Firebase con try/catch — si falla, el login con Google se desactiva
// pero el resto de la app sigue funcionando.
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let googleProvider: GoogleAuthProvider | null = null;

try {
  if (firebaseConfig.apiKey && firebaseConfig.projectId) {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();
    googleProvider.setCustomParameters({ prompt: 'select_account' });
  } else {
    console.warn('Firebase no está configurado — el login con Google estará desactivado.');
  }
} catch (err) {
  console.warn('No se pudo inicializar Firebase. El login con Google estará desactivado.', err);
}
// Mantener referencia a `app` para que el linter no la marque como no usada
void app;

// ============================================
// COMPONENTE LOGIN
// ============================================
export default function LoginPage() {
  // Estados del formulario
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  
  const navigate = useNavigate();

  // Estado para el modo oscuro - lee desde localStorage al iniciar
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });

  // Guardar preferencia y aplicar clase al <html>
  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  // Verificar si ya hay una sesión activa
  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    if (currentUser) {
      navigate('/home');
    }
  }, [navigate]);

  // ============================================
  // FUNCIONES
  // ============================================

  const toggleTheme = () => {
    setDarkMode(!darkMode);
  };

  /**
   * LOGIN CON EMAIL Y CONTRASEÑA
   */
  const handleLogin = async () => {
    setError('');

    // Validaciones básicas
    if (!email || !password) {
      setError('Por favor completa todos los campos');
      return;
    }

    if (!email.includes('@')) {
      setError('Por favor ingresa un correo electrónico válido');
      return;
    }

    if (!auth) {
      setError('La autenticación no está disponible. Verifica la configuración de Firebase.');
      return;
    }

    setLoading(true);

    try {
      await authService.loginWithEmail(auth, email, password);
      navigate('/home');

    } catch (error: any) {
      console.error('❌ Error al iniciar sesión:', error);
      
      // Mostrar mensaje de error amigable
      if (error.message.includes('no registrado') || 
          error.message.includes('not found')) {
        setError('noRegistrado');
      } else {
        setError(error.message || 'Error al iniciar sesión. Verifica tus credenciales.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      handleLogin();
    }
  };

  /**
   * LOGIN CON GOOGLE
   */
  const handleGoogleLogin = async () => {
    if (!auth || !googleProvider) {
      setError('Login con Google no disponible (Firebase no está configurado).');
      return;
    }

    setLoadingGoogle(true);
    setLoading(true);
    setError('');

    try {
      await authService.loginWithGoogle(auth, googleProvider);
      navigate('/home');
    } catch (error: any) {
      if (!error.message.includes('cancelada')) {
        setError(error.message || 'Error al iniciar sesión con Google.');
      }
    } finally {
      setLoadingGoogle(false);
      setLoading(false);
    }
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6 md:p-8 bg-cover bg-center relative transition-all duration-300"
      style={{ backgroundImage: `url(${fondoImagen})` }}
    >
      {/* Overlay — mismo estilo que LandingPage */}
      <div className={`absolute inset-0 z-0 transition-all duration-500 ${
        darkMode
          ? 'bg-gradient-to-b from-slate-950/90 via-slate-900/80 to-slate-950/90 backdrop-blur-[3px]'
          : 'bg-gradient-to-b from-sky-950/55 via-sky-900/30 to-sky-950/55 backdrop-blur-[5px]'
      }`} />

      {/* Botón volver a inicio */}
      <button
        onClick={() => navigate('/')}
        className={`fixed top-6 left-6 z-20 flex items-center gap-2 px-4 py-2.5 rounded-full shadow-xl border transition-all duration-300 hover:scale-105 text-sm font-medium ${
          darkMode
            ? 'bg-slate-800/80 backdrop-blur-xl border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white'
            : 'bg-white/90 backdrop-blur-sm border-slate-200 text-slate-600 shadow-slate-300/60 hover:bg-white hover:text-slate-900'
        }`}
        title="Volver al inicio"
      >
        <ChevronLeft className="w-4 h-4" />
        Inicio
      </button>

      {/* Botón de tema */}
      <button
        onClick={toggleTheme}
        className={`fixed bottom-6 right-6 z-20 p-4 rounded-full shadow-2xl border transition-all duration-300 hover:scale-110 hover:rotate-12 ${
          darkMode
            ? 'bg-slate-800/80 backdrop-blur-xl border-slate-600 text-yellow-400 hover:bg-slate-700'
            : 'bg-white/90 backdrop-blur-sm border-slate-200 text-slate-600 shadow-slate-300/60 hover:bg-white'
        }`}
        title={darkMode ? "Cambiar a modo día" : "Cambiar a modo noche"}
      >
        {darkMode ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
      </button>
      
      {/* Contenedor principal */}
      <div className="rounded-xl shadow-2xl w-full max-w-6xl z-10 relative overflow-hidden transition-colors duration-300 bg-surface anim-scaleIn">
        <div className="grid md:grid-cols-2">
          
          {/* ============================================ */}
          {/* SECCIÓN IZQUIERDA - FORMULARIO */}
          {/* ============================================ */}
          <div className="px-4 sm:px-8 md:px-10 py-8 md:py-12 border-b md:border-b-0 md:border-r transition-colors duration-300 border-ui">
            {/* Logo */}
            <div className="mb-6 md:mb-8 flex items-center justify-center px-4 md:px-6" style={{ height: '110px' }}>
              <img
                src={darkMode ? logoUniversidadNoche : logoUniversidad}
                alt="Universidad de Ibagué"
                className="max-w-full max-h-full object-contain transition-opacity duration-300"
              />
            </div>

            {/* Formulario */}
            <div className="max-w-md mx-auto">
              {/* Campo Email */}
              <div className="mb-5">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Correo electrónico"
                  disabled={loading}
                  className={`w-full px-4 py-3.5 border rounded-lg text-base outline-none transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed bg-raised border-ui text-primary ${
                    darkMode
                      ? 'placeholder-gray-400 focus:border-blue-500'
                      : 'focus:border-[#003876] focus:bg-white'
                  }`}
                />
              </div>

              {/* Campo Contraseña */}
              <div className="mb-6">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Contraseña"
                  disabled={loading}
                  className={`w-full px-4 py-3.5 border rounded-lg text-base outline-none transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed bg-raised border-ui text-primary ${
                    darkMode
                      ? 'placeholder-gray-400 focus:border-blue-500'
                      : 'focus:border-[#003876] focus:bg-white'
                  }`}
                />
              </div>

              {/* Mensaje de error */}
              {error && (
                <div className={`px-4 py-3 rounded-lg mb-5 text-center text-sm transition-colors duration-300 ${
                  darkMode 
                    ? 'bg-red-900/30 text-red-400' 
                    : 'bg-red-50 text-red-600'
                }`}>
                  {error === 'noRegistrado' ? (
                    <span>
                      Este correo no está registrado.{' '}
                      <Link 
                        to="/register" 
                        className="font-semibold underline hover:text-red-300"
                      >
                        Crea una cuenta aquí
                      </Link>
                    </span>
                  ) : error === 'noRegistradoGoogle' ? (
                    <span>
                      Esta cuenta de Google no está registrada.{' '}
                      <Link 
                        to="/register" 
                        className="font-semibold underline hover:text-red-300"
                      >
                        Regístrate primero
                      </Link>
                    </span>
                  ) : (
                    error
                  )}
                </div>
              )}

              {/* Botón Acceder */}
              <button
                type="button"
                onClick={handleLogin}
                disabled={loading}
                className={`w-full py-4 rounded-lg text-base font-semibold transition-all duration-300 mb-5 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${
                  darkMode
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-[#003876] text-white hover:bg-[#00508f]'
                }`}
              >
                {loading ? 'Iniciando sesión...' : 'Acceder'}
              </button>

              {/* Recuperar contraseña */}
              <div className="text-center mb-4">
                <Link 
                  to="/recuperar-password" 
                  className={`text-base no-underline hover:underline transition-colors duration-300 ${
                    darkMode ? 'text-blue-400' : 'text-[#003876]'
                  }`}
                >
                  ¿Olvidó su contraseña?
                </Link>
              </div>

              {/* Enlace a registro */}
              <div className="text-center">
                <span className="text-base transition-colors duration-300 text-action">
                  ¿No tienes cuenta?{' '}
                </span>
                <Link 
                  to="/register" 
                  className={`text-base font-medium no-underline hover:underline transition-colors duration-300 ${
                    darkMode ? 'text-blue-400' : 'text-[#003876]'
                  }`}
                >
                  Regístrate aquí
                </Link>
              </div>
            </div>
          </div>

          {/* ============================================ */}
          {/* SECCIÓN DERECHA - LOGIN CON GOOGLE */}
          {/* ============================================ */}
          <div className="px-4 sm:px-8 md:px-10 py-8 md:py-12 flex flex-col justify-center items-center">
            <div className="text-center mb-8">
              <span className="text-lg font-medium transition-colors duration-300 text-secondary">
                Ingresar con
              </span>
            </div>

            {/* Botón Google */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className={`w-full max-w-sm px-8 py-5 border rounded-lg text-lg font-medium flex items-center justify-center gap-3 transition-all duration-300 hover:shadow-xl hover:scale-[1.03] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 bg-raised border-ui ${
                darkMode
                  ? 'text-gray-200 hover:bg-slate-700'
                  : 'text-gray-700 hover:bg-gray-50 hover:shadow-xl'
              }`}
            >
              {loadingGoogle ? (
                <>
                  <svg className="anim-spin-slow w-6 h-6" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Abriendo Google...
                </>
              ) : (
                <>
                  <svg width="24" height="24" viewBox="0 0 18 18">
                    <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" />
                    <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" />
                    <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z" />
                    <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" />
                  </svg>
                  Google
                </>
              )}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}