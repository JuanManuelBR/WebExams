import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Moon, Sun } from 'lucide-react';
import logoUniversidad from '../../assets/logo-universidad.png';
import logoUniversidadNoche from '../../assets/logo-universidad-noche.png';
import fondoImagen from '../../assets/fondo.jpg';
import ExamSearchBar from '../components/ExamSearchBar';

// Importa Firebase
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, updateProfile } from 'firebase/auth';

// Configuración de Firebase (la misma que en LoginPage)
const firebaseConfig = {
  apiKey: "AIzaSyBv1_xkK7oXRxxIXdvXTPsWOK3Joz6A2xo",
  authDomain: "universidad-tesis.firebaseapp.com",
  projectId: "universidad-tesis",
  storageBucket: "universidad-tesis.firebasestorage.app",
  messagingSenderId: "184984434762",
  appId: "1:184984434762:web:b747333b88718d7e5a4eb3"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    label: '',
    color: ''
  });
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

  // Función para calcular la fuerza de la contraseña
  const calculatePasswordStrength = (password: string) => {
    let score = 0;
    
    if (!password) {
      return { score: 0, label: '', color: '' };
    }

    // Criterios de evaluación
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;

    // Determinar nivel
    let label = '';
    let color = '';

    if (score <= 1) {
      label = 'Muy débil';
      color = '#ef4444';
    } else if (score === 2) {
      label = 'Débil';
      color = '#f97316';
    } else if (score === 3) {
      label = 'Aceptable';
      color = '#eab308';
    } else if (score === 4) {
      label = 'Fuerte';
      color = '#84cc16';
    } else {
      label = 'Muy fuerte';
      color = '#22c55e';
    }

    return { score, label, color };
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    setFormData({
      ...formData,
      [name]: value
    });

    if (name === 'password') {
      const strength = calculatePasswordStrength(value);
      setPasswordStrength(strength);
    }
  };

  const validateForm = () => {
    if (!formData.nombre || !formData.apellido || !formData.email || !formData.password || !formData.confirmPassword) {
      setError('Todos los campos son obligatorios');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Por favor ingresa un correo electrónico válido');
      return false;
    }

    if (formData.password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return false;
    }

    if (passwordStrength.score < 3) {
      setError('La contraseña debe ser al menos "Aceptable" (amarillo). Usa mayúsculas, minúsculas, números y caracteres especiales.');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return false;
    }

    return true;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );

      const user = userCredential.user;

      await updateProfile(user, {
        displayName: `${formData.nombre} ${formData.apellido}`
      });

      const newUser = {
        id: user.uid,
        username: formData.email,
        nombre: formData.nombre,
        apellido: formData.apellido,
        email: formData.email,
        rol: 'estudiante',
        loginMethod: 'email',
        picture: ''
      };

      localStorage.setItem('usuario', JSON.stringify(newUser));
      navigate('/');
    } catch (error: any) {
      console.error('Error al registrar usuario:', error);
      
      if (error.code === 'auth/email-already-in-use') {
        setError('Este correo electrónico ya está registrado');
      } else if (error.code === 'auth/invalid-email') {
        setError('Correo electrónico inválido');
      } else if (error.code === 'auth/weak-password') {
        setError('La contraseña es muy débil');
      } else {
        setError('Error al registrar usuario. Intenta de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      const googleUser = {
        id: user.uid,
        username: user.email || '',
        nombre: user.displayName?.split(' ')[0] || '',
        apellido: user.displayName?.split(' ').slice(1).join(' ') || '',
        email: user.email || '',
        rol: 'estudiante',
        loginMethod: 'google',
        picture: user.photoURL || ''
      };

      localStorage.setItem('usuario', JSON.stringify(googleUser));
      navigate('/');
    } catch (error: any) {
      console.error('Error al registrarse con Google:', error);
      setError('Error al registrarse con Google. Intenta de nuevo.');
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-5 bg-cover bg-center relative transition-all duration-300"
      style={{ backgroundImage: `url(${fondoImagen})` }}
    >
      {/* Barra de búsqueda de examen */}
      <ExamSearchBar onSearch={handleExamSearch} darkMode={darkMode} />

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
      
      <div className={`rounded-xl shadow-2xl w-full max-w-7xl z-10 relative overflow-hidden transition-colors duration-300 ${
        darkMode ? 'bg-slate-900' : 'bg-white'
      }`}>
        <div className="grid md:grid-cols-2">
          
          <div className={`px-7 py-9 border-r transition-colors duration-300 ${
            darkMode ? 'border-slate-700' : 'border-gray-200'
          }`}>
            <div className="mb-3 flex items-center justify-center transition-all duration-300" style={{ height: '140px' }}>
              <img
                src={darkMode ? logoUniversidadNoche : logoUniversidad}
                alt="Universidad de Ibagué"
                className="max-w-full max-h-full object-contain transition-all duration-300"
              />
            </div>

            <h2 className={`text-2xl font-bold text-center mb-5 transition-all duration-300 ${
              darkMode ? 'text-blue-400' : 'text-[#003876]'
            }`}>
              Crear Cuenta
            </h2>

            <form onSubmit={handleRegister}>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <input
                    type="text"
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleChange}
                    placeholder="Nombre"
                    required
                    className={`w-full px-4 py-3 border rounded-md text-base outline-none transition-all duration-300 ${
                      darkMode
                        ? 'bg-slate-800 border-slate-700 text-white placeholder-gray-400 focus:border-blue-500'
                        : 'bg-gray-50 border-gray-300 text-gray-900 focus:border-[#003876] focus:bg-white'
                    }`}
                  />
                </div>

                <div>
                  <input
                    type="text"
                    name="apellido"
                    value={formData.apellido}
                    onChange={handleChange}
                    placeholder="Apellido"
                    required
                    className={`w-full px-4 py-3 border rounded-md text-base outline-none transition-all duration-300 ${
                      darkMode
                        ? 'bg-slate-800 border-slate-700 text-white placeholder-gray-400 focus:border-blue-500'
                        : 'bg-gray-50 border-gray-300 text-gray-900 focus:border-[#003876] focus:bg-white'
                    }`}
                  />
                </div>
              </div>

              <div className="mb-4">
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Correo electrónico"
                  required
                  className={`w-full px-4 py-3 border rounded-md text-base outline-none transition-all duration-300 ${
                    darkMode
                      ? 'bg-slate-800 border-slate-700 text-white placeholder-gray-400 focus:border-blue-500'
                      : 'bg-gray-50 border-gray-300 text-gray-900 focus:border-[#003876] focus:bg-white'
                  }`}
                />
              </div>

              <div className="mb-4">
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Contraseña"
                  required
                  className={`w-full px-4 py-3 border rounded-md text-base outline-none transition-all duration-300 ${
                    darkMode
                      ? 'bg-slate-800 border-slate-700 text-white placeholder-gray-400 focus:border-blue-500'
                      : 'bg-gray-50 border-gray-300 text-gray-900 focus:border-[#003876] focus:bg-white'
                  }`}
                />
              </div>

              <div className="mb-4">
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirmar contraseña"
                  required
                  className={`w-full px-4 py-3 border rounded-md text-base outline-none transition-all duration-300 ${
                    darkMode
                      ? 'bg-slate-800 border-slate-700 text-white placeholder-gray-400 focus:border-blue-500'
                      : 'bg-gray-50 border-gray-300 text-gray-900 focus:border-[#003876] focus:bg-white'
                  }`}
                />
              </div>

              <div className="mb-4">
                <div className={`w-full h-2 rounded-full overflow-hidden mb-2 ${
                  darkMode ? 'bg-slate-700' : 'bg-gray-200'
                }`}>
                  <div
                    className="h-full transition-all duration-500 ease-out"
                    style={{
                      width: formData.password ? `${(passwordStrength.score / 5) * 100}%` : '0%',
                      backgroundColor: formData.password ? passwordStrength.color : (darkMode ? '#475569' : '#d1d5db')
                    }}
                  />
                </div>
                
                <div className="flex items-center justify-between mb-2">
                  <span
                    className="text-sm font-medium"
                    style={{ color: formData.password ? passwordStrength.color : (darkMode ? '#9ca3af' : '#9ca3af') }}
                  >
                    {formData.password ? passwordStrength.label : 'Sin contraseña'}
                  </span>
                  <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Mínimo: Aceptable
                  </span>
                </div>
                
                <div className={`text-xs space-y-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  <div className="flex items-center gap-1">
                    <span className={formData.password.length >= 8 ? 'text-green-600' : (darkMode ? 'text-gray-500' : 'text-gray-400')}>
                      {formData.password.length >= 8 ? '✓' : '○'}
                    </span>
                    <span>Mínimo 8 caracteres</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={/[a-z]/.test(formData.password) && /[A-Z]/.test(formData.password) ? 'text-green-600' : (darkMode ? 'text-gray-500' : 'text-gray-400')}>
                      {/[a-z]/.test(formData.password) && /[A-Z]/.test(formData.password) ? '✓' : '○'}
                    </span>
                    <span>Mayúsculas y minúsculas</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={/\d/.test(formData.password) ? 'text-green-600' : (darkMode ? 'text-gray-500' : 'text-gray-400')}>
                      {/\d/.test(formData.password) ? '✓' : '○'}
                    </span>
                    <span>Al menos un número</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={/[^a-zA-Z0-9]/.test(formData.password) ? 'text-green-600' : (darkMode ? 'text-gray-500' : 'text-gray-400')}>
                      {/[^a-zA-Z0-9]/.test(formData.password) ? '✓' : '○'}
                    </span>
                    <span>Caracteres especiales (!@#$%)</span>
                  </div>
                </div>
              </div>

              {error && (
                <div className={`px-3 py-2.5 rounded-md mb-4 text-center text-sm transition-colors duration-300 ${
                  darkMode 
                    ? 'bg-red-900/30 text-red-400' 
                    : 'bg-red-50 text-red-600'
                }`}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3.5 rounded-md text-base font-semibold transition-all duration-300 mb-4 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${
                  darkMode
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-[#003876] text-white hover:bg-[#00508f]'
                }`}
              >
                {loading ? 'Registrando...' : 'Registrarse'}
              </button>

              <div className="text-center">
                <span className={`text-base ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  ¿Ya tienes cuenta?{' '}
                </span>
                <Link
                  to="/login"
                  className={`text-base font-medium no-underline hover:underline ${
                    darkMode ? 'text-blue-400' : 'text-[#003876]'
                  }`}
                >
                  Inicia sesión
                </Link>
              </div>
            </form>
          </div>

          <div className="px-10 py-5 md:py-9 flex flex-col justify-center items-center">
            <div className="text-center mb-6">
              <h3 className={`text-xl font-semibold mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                Registro Rápido
              </h3>
              <p className={`text-base ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Crea tu cuenta con Google
              </p>
            </div>

            <button
              type="button"
              onClick={handleGoogleRegister}
              className={`px-8 py-2.5 border rounded-md text-base font-medium flex items-center justify-center gap-2.5 transition-all duration-300 hover:shadow-md hover:scale-[1.02] active:scale-[0.98] ${
                darkMode
                  ? 'bg-slate-800 text-gray-200 border-slate-700 hover:bg-slate-700'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400'
              }`}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" className="transition-transform duration-300">
                <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" />
                <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" />
                <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z" />
                <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" />
              </svg>
              Registrarse con Google
            </button>

            <div className={`mt-8 text-center text-sm max-w-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              <p>
                Al registrarte, aceptas nuestros términos de servicio y política de privacidad
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}