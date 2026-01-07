import { useState } from 'react';
import { User, Camera, Mail, Phone, BookOpen, Save, X, FileEdit } from 'lucide-react';

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
    email: usuarioData?.email || '',
    telefono: usuarioData?.telefono || '',
    departamento: usuarioData?.departamento || ''
  });

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
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSave = () => {
    const updatedUser = {
      ...usuarioData,
      ...formData,
      foto: profileImage
    };
    localStorage.setItem('usuario', JSON.stringify(updatedUser));
    setIsEditing(false);
    alert('Cambios guardados exitosamente');
  };

  const handleCancel = () => {
    setFormData({
      nombre: usuarioData?.nombre || '',
      email: usuarioData?.email || '',
      telefono: usuarioData?.telefono || '',
      departamento: usuarioData?.departamento || ''
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

            <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} mb-2`}>
              {formData.nombre || 'Nombre Completo'}
            </h2>
            <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${darkMode ? 'bg-slate-800 text-white' : 'bg-slate-700 text-white'} mb-6`}>
              {formData.departamento || 'Departamento'}
            </span>

            {/* Información de Contacto */}
            <div className="space-y-3 text-left mt-6">
              <div className="flex items-center gap-3">
                <Mail className={`w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {formData.email || 'email@ejemplo.com'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className={`w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {formData.telefono || 'Sin teléfono'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <BookOpen className={`w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {formData.departamento || 'Sin departamento'}
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
            {/* Nombre Completo */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Nombre Completo
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
                placeholder="Prof. Carlos Pérez"
              />
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

            {/* Teléfono */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Teléfono
              </label>
              <input
                type="tel"
                name="telefono"
                value={formData.telefono}
                onChange={handleInputChange}
                disabled={!isEditing}
                className={`w-full px-4 py-3 rounded-lg border transition-colors ${
                  darkMode 
                    ? 'bg-slate-800 border-slate-700 text-white placeholder-gray-500 disabled:bg-slate-800/50' 
                    : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400 disabled:bg-gray-100'
                } ${isEditing ? 'focus:outline-none focus:ring-2 focus:ring-teal-500' : ''}`}
                placeholder="+57 311 234 5678"
              />
            </div>

            {/* Departamento/Facultad */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Departamento / Facultad
              </label>
              <input
                type="text"
                name="departamento"
                value={formData.departamento}
                onChange={handleInputChange}
                disabled={!isEditing}
                className={`w-full px-4 py-3 rounded-lg border transition-colors ${
                  darkMode 
                    ? 'bg-slate-800 border-slate-700 text-white placeholder-gray-500 disabled:bg-slate-800/50' 
                    : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400 disabled:bg-gray-100'
                } ${isEditing ? 'focus:outline-none focus:ring-2 focus:ring-teal-500' : ''}`}
                placeholder="Matemáticas"
              />
            </div>

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
                    className={`flex-1 text-white px-6 py-3 rounded-lg transition-colors font-medium flex items-center justify-center gap-2 ${
                      darkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-700 hover:bg-slate-600'
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