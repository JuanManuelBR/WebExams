import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Moon, Sun } from 'lucide-react';
import logoUniversidad from '../../assets/logo-universidad.webp';
import logoUniversidadNoche from '../../assets/logo-universidad-noche.webp';
import fondoImagen from '../../assets/fondo.webp';
import ExamSearchBar from '../components/ExamSearchBar';
import { authService } from '../services/Authservice';

// Importa Firebase
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

// ============================================
// CONFIGURACIÓN DE FIREBASE
// ============================================
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Inicializar Firebase solo si no está inicializado
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Configurar el provider para forzar la selección de cuenta
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// ============================================
// COMPONENTE LOGIN
// ============================================
export default function LoginPage() {
  // Estados del formulario
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();

  // Estado para el modo oscuro - lee desde localStorage al iniciar
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });

  // Guardar preferencia de modo oscuro cuando cambie
  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  // Verificar si ya hay una sesión activa
  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    if (currentUser) {
      console.log('ℹ️ Usuario ya autenticado, redirigiendo...');
      navigate('/');
    }
  }, [navigate]);

  // ============================================
  // FUNCIONES
  // ============================================

  const toggleTheme = () => {
    setDarkMode(!darkMode);
  };

  const handleExamSearch = (examCode: string) => {
    navigate(`/acceso-examen?code=${examCode}`);
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

    setLoading(true);

    try {
      console.log('🔐 Iniciando login con email...');
      
      // Usar el servicio de autenticación
      await authService.loginWithEmail(auth, email, password);

      console.log('✅ Login exitoso, redirigiendo...');
      
      // Navegar a la página principal
      navigate('/');
      
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
    setLoading(true);
    setError('');

    try {
      console.log('🔐 Iniciando login con Google...');
      
      // Usar el servicio de autenticación
      await authService.loginWithGoogle(auth, googleProvider);

      console.log('✅ Login con Google exitoso, redirigiendo...');
      
      // Navegar a la página principal
      navigate('/');
      
    } catch (error: any) {
      console.error('❌ Error al iniciar sesión con Google:', error);
      
      // Mostrar mensaje de error amigable
      if (error.message.includes('no registrado') || 
          error.message.includes('not found')) {
        setError('noRegistradoGoogle');
      } else if (error.message.includes('cancelada') || 
                 error.message.includes('cerrado')) {
        // No mostrar error si el usuario canceló
        setError('');
      } else {
        setError(error.message || 'Error al iniciar sesión con Google. Intenta de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <div
      className="min-h-screen flex items-center justify-center p-5 bg-cover bg-center relative transition-all duration-300"
      style={{ backgroundImage: `url(${fondoImagen})` }}
    >
      {/* Overlay oscuro ajustable según el tema */}
      <div className={`absolute inset-0 z-0 transition-all duration-300 ${
        darkMode ? 'bg-black/75' : 'bg-black/45'
      }`}></div>

      {/* Botón de tema en la esquina inferior derecha */}
      <button
        onClick={toggleTheme}
        className={`fixed bottom-6 right-6 z-20 p-3 rounded-full shadow-lg transition-all duration-300 ${
          darkMode 
            ? 'bg-slate-800 text-yellow-400 hover:bg-slate-700' 
            : 'bg-white text-gray-700 hover:bg-gray-100'
        }`}
        title={darkMode ? "Cambiar a modo día" : "Cambiar a modo noche"}
      >
        {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>

      {/* Barra de búsqueda */}
      <ExamSearchBar onSearch={handleExamSearch} darkMode={darkMode} />
      
      {/* Contenedor principal */}
      <div className={`rounded-xl shadow-2xl w-full max-w-7xl z-10 relative overflow-hidden transition-colors duration-300 ${
        darkMode ? 'bg-slate-900' : 'bg-white'
      }`}>
        <div className="grid md:grid-cols-2">
          
          {/* ============================================ */}
          {/* SECCIÓN IZQUIERDA - FORMULARIO */}
          {/* ============================================ */}
          <div className={`px-7 py-9 border-r transition-colors duration-300 ${
            darkMode ? 'border-slate-700' : 'border-gray-200'
          }`}>
            {/* Logo */}
            <div className="mb-0 flex items-center justify-center" style={{ height: '190px' }}>
              <img
                src={darkMode ? logoUniversidadNoche : logoUniversidad}
                alt="Universidad de Ibagué"
                className="max-w-full max-h-full object-contain transition-opacity duration-300"
              />
            </div>

            {/* Formulario */}
            <div>
              {/* Campo Email */}
              <div className="mb-4">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Correo electrónico"
                  disabled={loading}
                  className={`w-full px-4 py-3 border rounded-md text-base outline-none transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${
                    darkMode
                      ? 'bg-slate-800 border-slate-700 text-white placeholder-gray-400 focus:border-blue-500'
                      : 'bg-gray-50 border-gray-300 text-gray-900 focus:border-[#003876] focus:bg-white'
                  }`}
                />
              </div>

              {/* Campo Contraseña */}
              <div className="mb-5">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Contraseña"
                  disabled={loading}
                  className={`w-full px-4 py-3 border rounded-md text-base outline-none transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${
                    darkMode
                      ? 'bg-slate-800 border-slate-700 text-white placeholder-gray-400 focus:border-blue-500'
                      : 'bg-gray-50 border-gray-300 text-gray-900 focus:border-[#003876] focus:bg-white'
                  }`}
                />
              </div>

              {/* Mensaje de error */}
              {error && (
                <div className={`px-3 py-2.5 rounded-md mb-4 text-center text-sm transition-colors duration-300 ${
                  darkMode 
                    ? 'bg-red-900/30 text-red-400' 
                    : 'bg-red-50 text-red-600'
                }`}>
                  {error === 'noRegistrado' ? (
                    <span>
                      Este correo no está registrado.{' '}
                      <Link 
                        to="/teacher-registration" 
                        className="font-semibold underline hover:text-red-300"
                      >
                        Crea una cuenta aquí
                      </Link>
                    </span>
                  ) : error === 'noRegistradoGoogle' ? (
                    <span>
                      Esta cuenta de Google no está registrada.{' '}
                      <Link 
                        to="/teacher-registration" 
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
                className={`w-full py-3.5 rounded-md text-base font-semibold transition-all duration-300 mb-4 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${
                  darkMode
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-[#003876] text-white hover:bg-[#00508f]'
                }`}
              >
                {loading ? 'Iniciando sesión...' : 'Acceder'}
              </button>

              {/* Recuperar contraseña */}
              <div className="text-center mb-3">
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
                <span className={`text-base transition-colors duration-300 ${
                  darkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  ¿No tienes cuenta?{' '}
                </span>
                <Link 
                  to="/teacher-registration" 
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
          <div className="px-10 py-5 md:py-9 flex flex-col justify-center items-center">
            <div className="text-center mb-4">
              <span className={`text-base font-medium transition-colors duration-300 ${
                darkMode ? 'text-gray-300' : 'text-gray-600'
              }`}>
                Ingresar con
              </span>
            </div>

            {/* Botón Google */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className={`px-8 py-2.5 border rounded-md text-base font-medium flex items-center justify-center gap-2.5 transition-all duration-300 hover:shadow-md hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${
                darkMode
                  ? 'bg-slate-800 text-gray-200 border-slate-700 hover:bg-slate-700'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:shadow-md'
              }`}
            >
              {loading ? (
                <span>Cargando...</span>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 18 18">
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