import { useState, useEffect } from 'react';
import { User, Mail, Save, X, FileEdit, Lock, AlertCircle } from 'lucide-react';
import ModalConfirmacion from "../components/ModalConfirmacion";

interface MiPerfilProps {
  darkMode: boolean;
}

interface UserData {
  id: number;
  nombres: string;
  apellidos: string;
  email: string;
  foto_perfil: string | null;
  login_method?: 'email' | 'google';
}

export default function MiPerfil({ darkMode }: MiPerfilProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const [loginMethod, setLoginMethod] = useState<'email' | 'google'>('email');
  const [profileImage, setProfileImage] = useState('');
  const [formData, setFormData] = useState({
    nombres: '',
    apellidos: '',
    email: '',
    contrasena: '',
    confirmar_nueva_contrasena: ''
  });
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    label: '',
    color: ''
  });

  const [modal, setModal] = useState<{ visible: boolean; tipo: "exito" | "error" | "advertencia" | "info" | "confirmar"; titulo: string; mensaje: string; onConfirmar: () => void }>({ visible: false, tipo: "info", titulo: "", mensaje: "", onConfirmar: () => {} });
  const mostrarModal = (tipo: "exito" | "error" | "advertencia" | "info" | "confirmar", titulo: string, mensaje: string, onConfirmar: () => void) => setModal({ visible: true, tipo, titulo, mensaje, onConfirmar });
  const cerrarModal = () => setModal(prev => ({ ...prev, visible: false }));

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      setIsLoading(true);
      
      const usuarioStorage = localStorage.getItem('usuario');
      console.log('📦 Usuario en localStorage:', usuarioStorage);
      
      if (!usuarioStorage) {
        mostrarModal("error", "Sin sesión", "No hay sesión activa. Por favor inicia sesión nuevamente.", () => { cerrarModal(); window.location.href = '/login'; });
        return;
      }

      const usuarioData = JSON.parse(usuarioStorage);
      console.log('👤 Datos del usuario:', usuarioData);
      
      const id = usuarioData.id;
      
      if (!id) {
        mostrarModal("error", "Error de usuario", "No se encontró el ID del usuario. Por favor inicia sesión nuevamente.", () => { cerrarModal(); window.location.href = '/login'; });
        return;
      }
      
      setUserId(id);
      
      const method = usuarioData.loginMethod || 'email';
      setLoginMethod(method);
      console.log('🔐 Método de login:', method);

      console.log('🔄 Haciendo petición a:', `/api/users/${id}`);
      console.log('🍪 Cookies disponibles:', document.cookie);
      
      const response = await fetch(`/api/users/${id}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('📡 Respuesta del servidor:', response.status, response.statusText);

      if (response.status === 401) {
        mostrarModal("error", "Sesión expirada", "Tu sesión ha expirado. Por favor inicia sesión nuevamente.", () => { cerrarModal(); localStorage.removeItem('usuario'); window.location.href = '/login'; });
        return;
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error del servidor:', errorText);
        throw new Error(`Error ${response.status}: ${errorText}`);
      }

      const data: UserData = await response.json();
      console.log('✅ Datos recibidos:', data);

      setFormData({
        nombres: data.nombres || '',
        apellidos: data.apellidos || '',
        email: data.email || '',
        contrasena: '',
        confirmar_nueva_contrasena: ''
      });

      setProfileImage(data.foto_perfil || usuarioData.picture || '');
    } catch (error: any) {
      console.error('❌ Error completo al cargar perfil:', error);
      mostrarModal("error", "Error", `Error al cargar los datos del perfil: ${error.message}`, cerrarModal);
    } finally {
      setIsLoading(false);
    }
  };

  const calculatePasswordStrength = (password: string) => {
    let score = 0;
    
    if (!password) {
      return { score: 0, label: '', color: '' };
    }

    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    setFormData({
      ...formData,
      [name]: value
    });

    if (name === 'contrasena') {
      const strength = calculatePasswordStrength(value);
      setPasswordStrength(strength);
    }
  };

  const handleSave = async () => {
    if (!userId) {
      mostrarModal("error", "Error", "No se encontró el ID del usuario", cerrarModal);
      return;
    }

    if (formData.contrasena) {
      if (formData.contrasena !== formData.confirmar_nueva_contrasena) {
        mostrarModal("advertencia", "Contraseña", "Las contraseñas no coinciden", cerrarModal);
        return;
      }
      if (formData.contrasena.length < 8) {
        mostrarModal("advertencia", "Contraseña", "La contraseña debe tener al menos 8 caracteres", cerrarModal);
        return;
      }
      if (passwordStrength.score < 3) {
        mostrarModal("advertencia", "Contraseña débil", "La contraseña debe ser al menos \"Aceptable\". Usa mayúsculas, minúsculas, números y caracteres especiales.", cerrarModal);
        return;
      }
    }

    try {
      setIsLoading(true);
      
      const updateData: any = {
        nombres: formData.nombres,
        apellidos: formData.apellidos
      };

      if (loginMethod !== 'google') {
        updateData.email = formData.email;
      }

      if (formData.contrasena) {
        updateData.contrasena = formData.contrasena;
        updateData.confirmar_nueva_contrasena = formData.confirmar_nueva_contrasena;
      }

      const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al actualizar el perfil');
      }

      const data = await response.json();
      
      const usuarioStorage = localStorage.getItem('usuario');
      if (usuarioStorage) {
        const usuario = JSON.parse(usuarioStorage);
        const updatedUsuario = {
          ...usuario,
          nombre: data.nombres,
          apellido: data.apellidos,
          nombres: data.nombres,
          apellidos: data.apellidos,
          email: data.email,
          foto_perfil: data.foto_perfil,
          picture: data.foto_perfil || usuario.picture
        };
        localStorage.setItem('usuario', JSON.stringify(updatedUsuario));
        
        console.log('✅ Usuario actualizado en localStorage:', updatedUsuario);
        
        window.dispatchEvent(new Event('usuarioActualizado'));
        console.log('✅ Evento "usuarioActualizado" disparado');
      }
      
      setFormData({
        nombres: data.nombres,
        apellidos: data.apellidos,
        email: data.email,
        contrasena: '',
        confirmar_nueva_contrasena: ''
      });
      
      setProfileImage(data.foto_perfil || '');
      setPasswordStrength({ score: 0, label: '', color: '' });
      setIsEditing(false);
      mostrarModal("exito", "Guardado", "Cambios guardados exitosamente", cerrarModal);
      
    } catch (error: any) {
      console.error('Error al guardar:', error);
      alert(error.message || 'Error al guardar los cambios');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    fetchUserProfile();
    setPasswordStrength({ score: 0, label: '', color: '' });
    setIsEditing(false);
  };

  if (isLoading && !formData.nombres) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className={`text-lg ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Cargando perfil...
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panel Izquierdo */}
        <div className={`${darkMode ? 'bg-slate-900' : 'bg-white'} rounded-lg shadow-sm p-6`}>
          <div className="text-center">
            <h3 className={`text-sm font-medium mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Mi Perfil
            </h3>

            <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'} mb-6`}>
              Información del docente
            </p>
            
            {/* Foto de Perfil */}
            <div className="relative inline-block mb-6">
              <div className="w-32 h-32 rounded-full overflow-hidden bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                {profileImage ? (
                  <img src={profileImage} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <User className="w-16 h-16 text-white" />
                )}
              </div>
            </div>

            <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} mb-6`}>
              {formData.nombres && formData.apellidos ? `${formData.nombres} ${formData.apellidos}` : 'Nombre Completo'}
            </h2>

            {/* Información de Contacto */}
            <div className="space-y-3 text-left mt-6">
              <div className="flex items-center gap-3">
                <Mail className={`w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {formData.email || 'email@ejemplo.com'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Panel Derecho */}
        <div className={`lg:col-span-2 ${darkMode ? 'bg-slate-900' : 'bg-white'} rounded-lg shadow-sm p-6`}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Editar Información
              </h2>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
                Actualiza tus datos personales
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Nombre y Apellido */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Nombres
                </label>
                <input
                  type="text"
                  name="nombres"
                  value={formData.nombres}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className={`w-full px-4 py-3 rounded-lg border transition-colors ${
                    darkMode 
                      ? 'bg-slate-800 border-slate-700 text-white placeholder-gray-500 disabled:bg-slate-800/50' 
                      : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400 disabled:bg-gray-100'
                  } ${isEditing ? 'focus:outline-none focus:ring-2 focus:ring-teal-500' : ''}`}
                  placeholder="Carlos"
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Apellidos
                </label>
                <input
                  type="text"
                  name="apellidos"
                  value={formData.apellidos}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className={`w-full px-4 py-3 rounded-lg border transition-colors ${
                    darkMode 
                      ? 'bg-slate-800 border-slate-700 text-white placeholder-gray-500 disabled:bg-slate-800/50' 
                      : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400 disabled:bg-gray-100'
                  } ${isEditing ? 'focus:outline-none focus:ring-2 focus:ring-teal-500' : ''}`}
                  placeholder="Pérez"
                />
              </div>
            </div>

            {/* Correo Electrónico */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Correo Electrónico
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                disabled={!isEditing || loginMethod === 'google'}
                className={`w-full px-4 py-3 rounded-lg border transition-colors ${
                  darkMode 
                    ? 'bg-slate-800 border-slate-700 text-white placeholder-gray-500 disabled:bg-slate-800/50 disabled:opacity-60' 
                    : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400 disabled:bg-gray-100 disabled:opacity-60'
                } ${isEditing && loginMethod !== 'google' ? 'focus:outline-none focus:ring-2 focus:ring-teal-500' : ''}`}
                placeholder="carlos.perez@colegio.edu"
              />
              {loginMethod === 'google' && (
                <p className={`mt-2 text-xs flex items-center gap-1.5 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                  <AlertCircle className="w-3.5 h-3.5" />
                  El correo de Google no puede ser modificado
                </p>
              )}
            </div>

            {/* Sección de Cambio de Contraseña */}
            {isEditing && loginMethod === 'email' && (
              <div className={`pt-4 border-t ${darkMode ? 'border-slate-800' : 'border-gray-200'}`}>
                <h3 className={`text-sm font-semibold mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Cambiar Contraseña (opcional)
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Nueva Contraseña
                    </label>
                    <div className="relative">
                      <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                      <input
                        type="password"
                        name="contrasena"
                        value={formData.contrasena}
                        onChange={handleInputChange}
                        className={`w-full pl-10 pr-4 py-3 rounded-lg border transition-colors ${
                          darkMode 
                            ? 'bg-slate-800 border-slate-700 text-white placeholder-gray-500' 
                            : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'
                        } focus:outline-none focus:ring-2 focus:ring-teal-500`}
                        placeholder="Mínimo 8 caracteres"
                      />
                    </div>
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Confirmar Nueva Contraseña
                    </label>
                    <div className="relative">
                      <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                      <input
                        type="password"
                        name="confirmar_nueva_contrasena"
                        value={formData.confirmar_nueva_contrasena}
                        onChange={handleInputChange}
                        className={`w-full pl-10 pr-4 py-3 rounded-lg border transition-colors ${
                          darkMode 
                            ? 'bg-slate-800 border-slate-700 text-white placeholder-gray-500' 
                            : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'
                        } focus:outline-none focus:ring-2 focus:ring-teal-500`}
                        placeholder="Repite la nueva contraseña"
                      />
                    </div>
                  </div>

                  {/* Medidor de Seguridad */}
                  <div className={`transition-all duration-300 ${
                    formData.contrasena 
                      ? 'opacity-100 max-h-48' 
                      : 'opacity-40 max-h-48'
                  }`}>
                    <div className={`w-full h-2 rounded-full overflow-hidden mb-2 ${
                      darkMode ? 'bg-slate-700' : 'bg-gray-200'
                    }`}>
                      <div
                        className="h-full transition-all duration-500 ease-out"
                        style={{
                          width: formData.contrasena ? `${(passwordStrength.score / 5) * 100}%` : '0%',
                          backgroundColor: formData.contrasena ? passwordStrength.color : (darkMode ? '#475569' : '#d1d5db')
                        }}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className="text-sm font-medium transition-colors duration-300"
                        style={{ color: formData.contrasena ? passwordStrength.color : (darkMode ? '#9ca3af' : '#9ca3af') }}
                      >
                        {formData.contrasena ? passwordStrength.label : 'Sin contraseña'}
                      </span>
                      <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Mínimo: Aceptable
                      </span>
                    </div>
                    
                    <div className={`text-xs space-y-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      <div className="flex items-center gap-1">
                        <span className={`transition-colors duration-200 ${formData.contrasena.length >= 8 ? 'text-green-600' : (darkMode ? 'text-gray-500' : 'text-gray-400')}`}>
                          {formData.contrasena.length >= 8 ? '✓' : '○'}
                        </span>
                        <span>Mínimo 8 caracteres</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className={`transition-colors duration-200 ${/[a-z]/.test(formData.contrasena) && /[A-Z]/.test(formData.contrasena) ? 'text-green-600' : (darkMode ? 'text-gray-500' : 'text-gray-400')}`}>
                          {/[a-z]/.test(formData.contrasena) && /[A-Z]/.test(formData.contrasena) ? '✓' : '○'}
                        </span>
                        <span>Mayúsculas y minúsculas</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className={`transition-colors duration-200 ${/\d/.test(formData.contrasena) ? 'text-green-600' : (darkMode ? 'text-gray-500' : 'text-gray-400')}`}>
                          {/\d/.test(formData.contrasena) ? '✓' : '○'}
                        </span>
                        <span>Al menos un número</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className={`transition-colors duration-200 ${/[^a-zA-Z0-9]/.test(formData.contrasena) ? 'text-green-600' : (darkMode ? 'text-gray-500' : 'text-gray-400')}`}>
                          {/[^a-zA-Z0-9]/.test(formData.contrasena) ? '✓' : '○'}
                        </span>
                        <span>Caracteres especiales (!@#$%)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Botones de Acción */}
            <div className="flex gap-3 pt-4">
              {!isEditing ? (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className={`flex-1 text-white px-6 py-3 rounded-lg transition-colors font-medium flex items-center justify-center gap-2 ${
                    darkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-700 hover:bg-slate-600'
                  }`}
                >
                  <FileEdit className="w-4 h-4" />
                  Editar Perfil
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isLoading || !!(formData.contrasena && passwordStrength.score < 3)}
                    className={`flex-1 text-white px-6 py-3 rounded-lg transition-colors font-medium flex items-center justify-center gap-2 ${
                      (isLoading || (formData.contrasena && passwordStrength.score < 3))
                        ? 'bg-slate-400 cursor-not-allowed opacity-50'
                        : darkMode 
                          ? 'bg-slate-700 hover:bg-slate-600' 
                          : 'bg-slate-700 hover:bg-slate-600'
                    }`}
                  >
                    <Save className="w-4 h-4" />
                    {isLoading ? 'Guardando...' : 'Guardar Cambios'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={isLoading}
                    className={`flex-1 px-6 py-3 rounded-lg transition-colors font-medium flex items-center justify-center gap-2 ${
                      darkMode 
                        ? 'bg-slate-800 text-gray-300 hover:bg-slate-700' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <X className="w-4 h-4" />
                    Cancelar
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}