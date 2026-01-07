import { useState } from 'react';
import { User, Camera, Mail, Save, X, FileEdit, Lock } from 'lucide-react';

interface MiPerfilProps {
  darkMode: boolean;
}

export default function MiPerfil({ darkMode }: MiPerfilProps) {
  const usuarioStorage = localStorage.getItem('usuario');
  const usuarioData = usuarioStorage ? JSON.parse(usuarioStorage) : null;
  
  const [isEditing, setIsEditing] = useState(false);
  const [profileImage, setProfileImage] = useState(usuarioData?.foto || '');
  const [formData, setFormData] = useState({
    nombre: usuarioData?.nombre || '',
    apellido: usuarioData?.apellido || '',
    email: usuarioData?.email || '',
    contrasenaActual: '',
    contrasenaNueva: '',
    contrasenaConfirmar: ''
  });
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    label: '',
    color: ''
  });

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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    setFormData({
      ...formData,
      [name]: value
    });

    if (name === 'contrasenaNueva') {
      const strength = calculatePasswordStrength(value);
      setPasswordStrength(strength);
    }
  };

  const handleSave = () => {
    // Validar contraseñas si se están cambiando
    if (formData.contrasenaNueva || formData.contrasenaConfirmar) {
      if (!formData.contrasenaActual) {
        alert('Debes ingresar tu contraseña actual');
        return;
      }
      if (formData.contrasenaNueva !== formData.contrasenaConfirmar) {
        alert('Las contraseñas nuevas no coinciden');
        return;
      }
      if (formData.contrasenaNueva.length < 8) {
        alert('La contraseña debe tener al menos 8 caracteres');
        return;
      }
      if (passwordStrength.score < 3) {
        alert('La contraseña debe ser al menos "Aceptable" (amarillo). Usa mayúsculas, minúsculas, números y caracteres especiales.');
        return;
      }
    }

    const updatedUser = {
      ...usuarioData,
      nombre: formData.nombre,
      apellido: formData.apellido,
      email: formData.email,
      foto: profileImage
    };

    // Si hay nueva contraseña, actualizarla
    if (formData.contrasenaNueva) {
      updatedUser.password = formData.contrasenaNueva;
    }

    localStorage.setItem('usuario', JSON.stringify(updatedUser));
    
    // Limpiar campos de contraseña
    setFormData({
      ...formData,
      contrasenaActual: '',
      contrasenaNueva: '',
      contrasenaConfirmar: ''
    });
    
    setPasswordStrength({ score: 0, label: '', color: '' });
    
    setIsEditing(false);
    alert('Cambios guardados exitosamente');
  };

  const handleCancel = () => {
    setFormData({
      nombre: usuarioData?.nombre || '',
      apellido: usuarioData?.apellido || '',
      email: usuarioData?.email || '',
      contrasenaActual: '',
      contrasenaNueva: '',
      contrasenaConfirmar: ''
    });
    setProfileImage(usuarioData?.foto || '');
    setIsEditing(false);
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panel Izquierdo - Información del Profesor */}
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
                  <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-16 h-16 text-white" />
                )}
              </div>
              {isEditing && (
                <label className="absolute bottom-0 right-0 bg-teal-600 rounded-full p-2 cursor-pointer hover:bg-teal-700 transition-colors">
                  <Camera className="w-4 h-4 text-white" />
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} mb-6`}>
              {formData.nombre && formData.apellido ? `${formData.nombre} ${formData.apellido}` : 'Nombre Completo'}
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

        {/* Panel Derecho - Editar Información */}
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

          <form className="space-y-6">
            {/* Nombre y Apellido en fila */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Nombre */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Nombre
                </label>
                <input
                  type="text"
                  name="nombre"
                  value={formData.nombre}
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

              {/* Apellido */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Apellido
                </label>
                <input
                  type="text"
                  name="apellido"
                  value={formData.apellido}
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
                disabled={!isEditing}
                className={`w-full px-4 py-3 rounded-lg border transition-colors ${
                  darkMode 
                    ? 'bg-slate-800 border-slate-700 text-white placeholder-gray-500 disabled:bg-slate-800/50' 
                    : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400 disabled:bg-gray-100'
                } ${isEditing ? 'focus:outline-none focus:ring-2 focus:ring-teal-500' : ''}`}
                placeholder="carlos.perez@colegio.edu"
              />
            </div>

            {/* Sección de Cambio de Contraseña */}
            {isEditing && (
              <div className={`pt-4 border-t ${darkMode ? 'border-slate-800' : 'border-gray-200'}`}>
                <h3 className={`text-sm font-semibold mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Cambiar Contraseña (opcional)
                </h3>
                
                <div className="space-y-4">
                  {/* Contraseña Actual */}
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Contraseña Actual
                    </label>
                    <div className="relative">
                      <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                      <input
                        type="password"
                        name="contrasenaActual"
                        value={formData.contrasenaActual}
                        onChange={handleInputChange}
                        className={`w-full pl-10 pr-4 py-3 rounded-lg border transition-colors ${
                          darkMode 
                            ? 'bg-slate-800 border-slate-700 text-white placeholder-gray-500' 
                            : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'
                        } focus:outline-none focus:ring-2 focus:ring-teal-500`}
                        placeholder="Ingresa tu contraseña actual"
                      />
                    </div>
                  </div>

                  {/* Nueva Contraseña */}
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Nueva Contraseña
                    </label>
                    <div className="relative">
                      <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                      <input
                        type="password"
                        name="contrasenaNueva"
                        value={formData.contrasenaNueva}
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

                  {/* Confirmar Nueva Contraseña */}
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Confirmar Nueva Contraseña
                    </label>
                    <div className="relative">
                      <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                      <input
                        type="password"
                        name="contrasenaConfirmar"
                        value={formData.contrasenaConfirmar}
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

                  {/* Medidor de Seguridad - Debajo de Confirmar Contraseña */}
                  <div className={`transition-all duration-300 ${
                    formData.contrasenaNueva 
                      ? 'opacity-100 max-h-48' 
                      : 'opacity-40 max-h-48'
                  }`}>
                    <div className={`w-full h-2 rounded-full overflow-hidden mb-2 ${
                      darkMode ? 'bg-slate-700' : 'bg-gray-200'
                    }`}>
                      <div
                        className="h-full transition-all duration-500 ease-out"
                        style={{
                          width: formData.contrasenaNueva ? `${(passwordStrength.score / 5) * 100}%` : '0%',
                          backgroundColor: formData.contrasenaNueva ? passwordStrength.color : (darkMode ? '#475569' : '#d1d5db')
                        }}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className="text-sm font-medium transition-colors duration-300"
                        style={{ color: formData.contrasenaNueva ? passwordStrength.color : (darkMode ? '#9ca3af' : '#9ca3af') }}
                      >
                        {formData.contrasenaNueva ? passwordStrength.label : 'Sin contraseña'}
                      </span>
                      <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Mínimo: Aceptable
                      </span>
                    </div>
                    
                    <div className={`text-xs space-y-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      <div className="flex items-center gap-1">
                        <span className={`transition-colors duration-200 ${formData.contrasenaNueva.length >= 8 ? 'text-green-600' : (darkMode ? 'text-gray-500' : 'text-gray-400')}`}>
                          {formData.contrasenaNueva.length >= 8 ? '✓' : '○'}
                        </span>
                        <span>Mínimo 8 caracteres</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className={`transition-colors duration-200 ${/[a-z]/.test(formData.contrasenaNueva) && /[A-Z]/.test(formData.contrasenaNueva) ? 'text-green-600' : (darkMode ? 'text-gray-500' : 'text-gray-400')}`}>
                          {/[a-z]/.test(formData.contrasenaNueva) && /[A-Z]/.test(formData.contrasenaNueva) ? '✓' : '○'}
                        </span>
                        <span>Mayúsculas y minúsculas</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className={`transition-colors duration-200 ${/\d/.test(formData.contrasenaNueva) ? 'text-green-600' : (darkMode ? 'text-gray-500' : 'text-gray-400')}`}>
                          {/\d/.test(formData.contrasenaNueva) ? '✓' : '○'}
                        </span>
                        <span>Al menos un número</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className={`transition-colors duration-200 ${/[^a-zA-Z0-9]/.test(formData.contrasenaNueva) ? 'text-green-600' : (darkMode ? 'text-gray-500' : 'text-gray-400')}`}>
                          {/[^a-zA-Z0-9]/.test(formData.contrasenaNueva) ? '✓' : '○'}
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
                    disabled={!!(formData.contrasenaNueva && passwordStrength.score < 3)}
                    className={`flex-1 text-white px-6 py-3 rounded-lg transition-colors font-medium flex items-center justify-center gap-2 ${
                      (formData.contrasenaNueva && passwordStrength.score < 3)
                        ? 'bg-slate-400 cursor-not-allowed opacity-50'
                        : darkMode 
                          ? 'bg-slate-700 hover:bg-slate-600' 
                          : 'bg-slate-700 hover:bg-slate-600'
                    }`}
                  >
                    <Save className="w-4 h-4" />
                    Guardar Cambios
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className={`flex-1 px-6 py-3 rounded-lg transition-colors font-medium flex items-center justify-center gap-2 ${
                      darkMode 
                        ? 'bg-slate-800 text-gray-300 hover:bg-slate-700' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    <X className="w-4 h-4" />
                    Cancelar
                  </button>
                </>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}