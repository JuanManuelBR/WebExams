import { useState, useEffect } from 'react';
import { Moon, Sun, Clock, User } from 'lucide-react';

interface StudentData {
  nombre?: string;
  apellido?: string;
  correoElectronico?: string;
  nombreProfesor?: string;
  numeroTelefono?: string;
  codigoEstudiante?: string;
  examCode: string;
  startTime: string;
}

export default function ExamSolver() {
  const [studentData, setStudentData] = useState<StudentData | null>(null);
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  
  // Estado para el modo oscuro
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  const toggleTheme = () => {
    setDarkMode(!darkMode);
  };

  // Cargar datos del estudiante
  useEffect(() => {
    const data = localStorage.getItem('studentData');
    if (data) {
      setStudentData(JSON.parse(data));
    }
  }, []);

  // Calcular tiempo transcurrido
  useEffect(() => {
    if (!studentData?.startTime) return;

    const interval = setInterval(() => {
      const start = new Date(studentData.startTime);
      const now = new Date();
      const diff = now.getTime() - start.getTime();

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setElapsedTime(
        `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [studentData]);

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      darkMode ? 'bg-slate-900' : 'bg-gray-50'
    }`}>
      {/* Header */}
      <header className={`sticky top-0 z-50 border-b transition-colors duration-300 ${
        darkMode 
          ? 'bg-slate-800 border-slate-700' 
          : 'bg-white border-gray-200'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`flex items-center gap-2 ${
                darkMode ? 'text-gray-200' : 'text-gray-700'
              }`}>
                <User className="w-5 h-5" />
                <span className="font-medium">
                  {studentData?.nombre} {studentData?.apellido}
                </span>
              </div>
              <div className={`h-6 w-px ${
                darkMode ? 'bg-slate-700' : 'bg-gray-300'
              }`}></div>
              <div className={`text-sm ${
                darkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Código: {studentData?.examCode}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className={`flex items-center gap-2 ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                <Clock className="w-5 h-5" />
                <span className="font-mono font-medium">{elapsedTime}</span>
              </div>
              
              <button
                onClick={toggleTheme}
                className={`p-2 rounded-lg transition-all duration-300 ${
                  darkMode 
                    ? 'bg-slate-700 text-yellow-400 hover:bg-slate-600' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                title={darkMode ? "Cambiar a modo día" : "Cambiar a modo noche"}
              >
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className={`rounded-xl p-8 transition-colors duration-300 ${
          darkMode ? 'bg-slate-800' : 'bg-white'
        }`}>
          <h1 className={`text-3xl font-bold mb-6 transition-colors duration-300 ${
            darkMode ? 'text-blue-400' : 'text-[#003876]'
          }`}>
            Examen en Progreso
          </h1>

          <div className={`mb-6 p-4 rounded-lg transition-colors duration-300 ${
            darkMode ? 'bg-slate-700' : 'bg-blue-50'
          }`}>
            <h2 className={`text-lg font-semibold mb-2 ${
              darkMode ? 'text-blue-300' : 'text-[#003876]'
            }`}>
              Información del Estudiante
            </h2>
            <div className={`grid grid-cols-1 md:grid-cols-2 gap-3 text-sm ${
              darkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              {studentData?.nombre && (
                <div><strong>Nombre:</strong> {studentData.nombre}</div>
              )}
              {studentData?.apellido && (
                <div><strong>Apellido:</strong> {studentData.apellido}</div>
              )}
              {studentData?.correoElectronico && (
                <div><strong>Correo:</strong> {studentData.correoElectronico}</div>
              )}
              {studentData?.nombreProfesor && (
                <div><strong>Profesor:</strong> {studentData.nombreProfesor}</div>
              )}
              {studentData?.numeroTelefono && (
                <div><strong>Teléfono:</strong> {studentData.numeroTelefono}</div>
              )}
              {studentData?.codigoEstudiante && (
                <div><strong>Código:</strong> {studentData.codigoEstudiante}</div>
              )}
            </div>
          </div>

          {/* Aquí puedes agregar las preguntas del examen */}
          <div className={`space-y-6 ${
            darkMode ? 'text-gray-300' : 'text-gray-700'
          }`}>
            <p className="text-lg">
              Aquí se mostrarán las preguntas del examen...
            </p>
            
            {/* Ejemplo de pregunta */}
            <div className={`p-6 rounded-lg transition-colors duration-300 ${
              darkMode ? 'bg-slate-700' : 'bg-gray-50'
            }`}>
              <h3 className={`font-semibold mb-3 ${
                darkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Pregunta 1
              </h3>
              <p className="mb-4">Contenido de la pregunta...</p>
              
              <div className="space-y-2">
                {['A', 'B', 'C', 'D'].map((option) => (
                  <label
                    key={option}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                      darkMode 
                        ? 'hover:bg-slate-600' 
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    <input
                      type="radio"
                      name="question1"
                      value={option}
                      className="w-4 h-4"
                    />
                    <span>Opción {option}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Botón de enviar */}
          <div className="mt-8 flex justify-end">
            <button
              className={`px-8 py-3 rounded-lg text-base font-medium transition-all ${
                darkMode
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              Finalizar Examen
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}