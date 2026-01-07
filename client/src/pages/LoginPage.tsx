import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Moon, Sun } from 'lucide-react';
import usuariosData from '../data/usuarios.json';
import logoUniversidad from '../../assets/logo-universidad.png';
import logoUniversidadNoche from '../../assets/logo-universidad-noche.png';
import fondoImagen from '../../assets/fondo.jpg';
import ExamSearchBar from '../components/ExamSearchBar';

// Importa Firebase
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBv1_xkK7oXRxxIXdvXTPsWOK3Joz6A2xo",
  authDomain: "universidad-tesis.firebaseapp.com",
  projectId: "universidad-tesis",
  storageBucket: "universidad-tesis.firebasestorage.app",
  messagingSenderId: "184984434762",
  appId: "1:184984434762:web:b747333b88718d7e5a4eb3"
};

// Inicializar Firebase solo si no está inicializado
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Configurar el provider para forzar la selección de cuenta
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export default function LoginPage() {
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

  const toggleTheme = () => {
    setDarkMode(!darkMode);
  };

  // Manejar búsqueda de examen - navega a /acceso-examen con el código
  const handleExamSearch = (examCode: string) => {
    navigate(`/acceso-examen?code=${examCode}`);
  };

  const handleLogin = () => {
    setError('');

    if (!email || !password) {
      setError('Por favor completa todos los campos');
      return;
    }

    // Buscar si el usuario existe por EMAIL
    const usuarioExiste = usuariosData.usuarios.find(u => u.email === email);

    if (!usuarioExiste) {
      setError('noRegistrado');
      return;
    }

    // Si el usuario existe, verificar la contraseña
    const usuario = usuariosData.usuarios.find(
      u => u.email === email && u.password === password
    );

    if (usuario) {
      const usuarioFormateado = {
        id: usuario.id,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        email: usuario.email,
        loginMethod: 'email'
      };
      localStorage.setItem('usuario', JSON.stringify(usuarioFormateado));
      navigate('/');
    } else {
      setError('Contraseña incorrecta');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError('');
      
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      const usuarioRegistrado = usuariosData.usuarios.find(
        u => u.email?.toLowerCase() === user.email?.toLowerCase()
      );

      if (!usuarioRegistrado) {
        setError('noRegistradoGoogle');
        await auth.signOut();
        setLoading(false);
        return;
      }

      const googleUser = {
        id: usuarioRegistrado.id,
        nombre: usuarioRegistrado.nombre,
        apellido: usuarioRegistrado.apellido,
        email: user.email || '',
        loginMethod: 'google',
        picture: user.photoURL || ''
      };

      localStorage.setItem('usuario', JSON.stringify(googleUser));
      navigate('/');
    } catch (error: any) {
      setLoading(false);
      
      if (error.code === 'auth/popup-closed-by-user' || 
          error.code === 'auth/cancelled-popup-request') {
        return;
      }
      
      if (error.code === 'auth/popup-blocked') {
        setError('El navegador bloqueó la ventana emergente. Por favor, permite ventanas emergentes para este sitio.');
        return;
      }
      
      if (error.code === 'auth/network-request-failed') {
        setError('Error de conexión. Verifica tu conexión a internet.');
        return;
      }
      
      if (error.code === 'auth/unauthorized-domain') {
        setError('Este dominio no está autorizado para login con Google. Contacta al administrador.');
        return;
      }
      
      setError('Error al iniciar sesión con Google. Intenta de nuevo.');
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-5 bg-cover bg-center relative transition-all duration-300"
      style={{ backgroundImage: `url(${fondoImagen})` }}
    >
      {/* Overlay oscuro ajustable según el tema */}
      <div className={`absolute inset-0 z-0 transition-all duration-300 ${
        darkMode ? 'bg-black/75' : 'bg-black/45'
      }`}></div>

      {/* Botón de tema en la esquina INFERIOR derecha */}
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
      
      <div className={`rounded-xl shadow-2xl w-full max-w-7xl z-10 relative overflow-hidden transition-colors duration-300 ${
        darkMode ? 'bg-slate-900' : 'bg-white'
      }`}>
        <div className="grid md:grid-cols-2">
          
          <div className={`px-7 py-9 border-r transition-colors duration-300 ${
            darkMode ? 'border-slate-700' : 'border-gray-200'
          }`}>
            <div className="mb-0 flex items-center justify-center" style={{ height: '190px' }}>
              <img
                src={darkMode ? logoUniversidadNoche : logoUniversidad}
                alt="Universidad de Ibagué"
                className="max-w-full max-h-full object-contain transition-opacity duration-300"
              />
            </div>

            <div>
              <div className="mb-4">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Correo electrónico"
                  className={`w-full px-4 py-3 border rounded-md text-base outline-none transition-all duration-300 ${
                    darkMode
                      ? 'bg-slate-800 border-slate-700 text-white placeholder-gray-400 focus:border-blue-500'
                      : 'bg-gray-50 border-gray-300 text-gray-900 focus:border-[#003876] focus:bg-white'
                  }`}
                />
              </div>

              <div className="mb-5">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Contraseña"
                  className={`w-full px-4 py-3 border rounded-md text-base outline-none transition-all duration-300 ${
                    darkMode
                      ? 'bg-slate-800 border-slate-700 text-white placeholder-gray-400 focus:border-blue-500'
                      : 'bg-gray-50 border-gray-300 text-gray-900 focus:border-[#003876] focus:bg-white'
                  }`}
                />
              </div>

              {error && (
                <div className={`px-3 py-2.5 rounded-md mb-4 text-center text-sm transition-colors duration-300 ${
                  darkMode 
                    ? 'bg-red-900/30 text-red-400' 
                    : 'bg-red-50 text-red-600'
                }`}>
                  {error === 'noRegistrado' ? (
                    <span>Este correo no está registrado. <Link to="/teacher-registration" className="font-semibold underline hover:text-red-300">Crea una cuenta aquí</Link></span>
                  ) : error === 'noRegistradoGoogle' ? (
                    <span>Esta cuenta de Google no está registrada. <Link to="/teacher-registration" className="font-semibold underline hover:text-red-300">Regístrate primero</Link></span>
                  ) : (
                    error
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={handleLogin}
                className={`w-full py-3.5 rounded-md text-base font-semibold transition-colors duration-300 mb-4 ${
                  darkMode
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-[#003876] text-white hover:bg-[#00508f]'
                }`}
              >
                Acceder
              </button>

              <div className="text-center mb-3">
                <a href="#" className={`text-base no-underline hover:underline transition-colors duration-300 ${
                  darkMode ? 'text-blue-400' : 'text-[#003876]'
                }`}>
                  ¿Olvidó su contraseña?
                </a>
              </div>

              <div className="text-center">
                <span className={`text-base transition-colors duration-300 ${
                  darkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>¿No tienes cuenta? </span>
                <Link to="/teacher-registration" className={`text-base font-medium no-underline hover:underline transition-colors duration-300 ${
                  darkMode ? 'text-blue-400' : 'text-[#003876]'
                }`}>
                  Regístrate aquí
                </Link>
              </div>
            </div>
          </div>

          <div className="px-10 py-5 md:py-9 flex flex-col justify-center items-center">
            <div className="text-center mb-4">
              <span className={`text-base font-medium transition-colors duration-300 ${
                darkMode ? 'text-gray-300' : 'text-gray-600'
              }`}>Ingresar con</span>
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className={`px-8 py-2.5 border rounded-md text-base font-medium flex items-center justify-center gap-2.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${
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