import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Moon, Sun } from "lucide-react";
import logoUniversidad from "../../assets/logo-universidad.webp";
import logoUniversidadNoche from "../../assets/logo-universidad-noche.webp";
import fondoImagen from "../../assets/fondo.webp";
import { examsService } from "../services/examsService";

// Tipos para los datos del formulario
interface FormData {
  nombre?: string;
  correoElectronico?: string;
  nombreProfesor?: string;
  numeroTelefono?: string;
  codigoEstudiante?: string;
  contrasena?: string;
}

export default function ExamAccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [examCode, setExamCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<FormData>({});
  const [formErrors, setFormErrors] = useState<Partial<FormData>>({});
  const [camposRequeridos, setCamposRequeridos] = useState<string[]>([]);
  const [examenData, setExamenData] = useState<any>(null);

  // Usar useRef para prevenir ejecución múltiple
  const hasProcessedUrl = useRef(false);
  const currentCode = useRef<string>("");

  // Estado para el modo oscuro - lee desde localStorage al iniciar
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("darkMode");
    return saved ? JSON.parse(saved) : false;
  });

  // Guardar preferencia de modo oscuro cuando cambie
  useEffect(() => {
    localStorage.setItem("darkMode", JSON.stringify(darkMode));
  }, [darkMode]);

  const toggleTheme = () => {
    setDarkMode(!darkMode);
  };

  // Iniciar examen - useCallback para evitar recreación
  const iniciarExamen = useCallback(
    (examen: any, datos: FormData = {}) => {
      console.log("🚀 Iniciando examen:", examen.nombre);
      console.log("📝 Datos del estudiante:", datos);
      if (examen.estado === "closed") {
        setError(
          "El examen no está disponible. Ha sido cerrado por el profesor.",
        );
        setShowForm(false);
        setExamenData(null);
        return;
      }

      // Guardar datos del estudiante y examen en localStorage
      const studentData = {
        ...datos,
        examCode: examen.codigoExamen,
        startTime: new Date().toISOString(),
      };

      localStorage.setItem("studentData", JSON.stringify(studentData));
      localStorage.setItem("currentExam", JSON.stringify(examen));

      console.log("💾 Datos guardados en localStorage");
      console.log("📊 studentData:", studentData);
      console.log("📊 currentExam:", examen);

      // Redirigir en la misma ventana a ExamSolver
      const rutaExamen = "/exam-solver";
      console.log("➡️ Redirigiendo a:", rutaExamen);

      // Usar setTimeout para asegurar que localStorage se guarde antes de navegar
      setTimeout(() => {
        navigate(rutaExamen);
      }, 100);
    },
    [navigate],
  );

  // Función para obtener campos requeridos del examen
  const obtenerCamposRequeridos = (examen: any): string[] => {
    const campos: string[] = [];

    if (examen.necesitaNombreCompleto) {
      campos.push("nombre");
    }
    if (examen.necesitaCorreoElectrónico) {
      campos.push("correoElectronico");
    }
    if (examen.necesitaCodigoEstudiantil) {
      campos.push("codigoEstudiante");
    }
    if (examen.necesitaContrasena) {
      campos.push("contrasena");
    }

    console.log("📋 Campos requeridos detectados:", campos);
    return campos;
  };

  // EFECTO PRINCIPAL: Cargar código desde URL
  useEffect(() => {
    const codeFromUrl = searchParams.get("code");

    // Si no hay código, resetear
    if (!codeFromUrl) {
      hasProcessedUrl.current = false;
      currentCode.current = "";
      return;
    }

    // Decodificar el código
    const decodedCode = decodeURIComponent(codeFromUrl.trim());

    // Si ya procesamos este código, no hacer nada
    if (hasProcessedUrl.current && currentCode.current === decodedCode) {
      return;
    }

    console.log("📍 Código detectado en URL:", decodedCode);
    console.log("📏 Longitud del código:", decodedCode.length);

    // Validar longitud (ahora 8 caracteres)
    if (decodedCode.length !== 8) {
      setError(
        `El código debe tener exactamente 8 caracteres. Recibido: ${decodedCode.length} caracteres`,
      );
      setLoading(false);
      return;
    }

    // Marcar como procesado
    hasProcessedUrl.current = true;
    currentCode.current = decodedCode;

    setExamCode(decodedCode);
    setError("");
    setLoading(true);

    // Buscar el examen
    const buscarExamen = async () => {
      try {
        const examen = await examsService.obtenerExamenPorCodigo(decodedCode);

        if (examen) {
          console.log("✅ Examen encontrado:", examen.nombre);
          if (examen.estado === "closed") {
            setError("El examen no aún no está abierto.");
            setLoading(false);
            return;
          }
          setExamenData(examen);

          const campos = obtenerCamposRequeridos(examen);
          setCamposRequeridos(campos);

          console.log("📋 Campos requeridos:", campos);

          // Si no hay campos requeridos, ir directo al examen
          if (campos.length === 0) {
            console.log(
              "⚡ Sin campos requeridos, iniciando examen directo...",
            );
            iniciarExamen(examen, {});
          } else {
            console.log("📝 Hay campos requeridos, mostrando formulario");
            setShowForm(true);
          }
          setError("");
        } else {
          console.log("❌ Examen no encontrado");
          setError("Código incorrecto. Verifica e intenta de nuevo.");
        }
      } catch (error) {
        console.error("❌ Error al buscar examen:", error);
        setError("Error al buscar el examen. Intenta nuevamente.");
      } finally {
        setLoading(false);
      }
    };

    buscarExamen();
  }, [searchParams, iniciarExamen]);

  // Buscar examen por código de 8 caracteres (manual)
  const handleSearchCode = async () => {
    setError("");

    if (!examCode.trim()) {
      setError("Por favor ingresa el código del examen.");
      return;
    }

    if (examCode.trim().length !== 8) {
      setError("El código debe tener exactamente 8 caracteres.");
      return;
    }

    setLoading(true);

    try {
      const examen = await examsService.obtenerExamenPorCodigo(examCode.trim());

      if (examen) {
        if (examen.estado === "closed") {
          setError("El examen no aún no está abierto");
          setLoading(false);
          return;
        }
        setExamenData(examen);

        // Obtener campos requeridos del examen
        const campos = obtenerCamposRequeridos(examen);
        setCamposRequeridos(campos);

        // Si no hay campos requeridos, ir directo al examen
        if (campos.length === 0) {
          iniciarExamen(examen, {});
        } else {
          setShowForm(true);
        }
        setError("");
      } else {
        setError("Código incorrecto. Verifica e intenta de nuevo.");
      }
    } catch (error) {
      console.error("❌ Error al buscar examen:", error);
      setError("Error al buscar el examen. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (!showForm) {
        handleSearchCode();
      } else {
        handleStartExam();
      }
    }
  };

  // Validar campos del formulario
  const validateForm = (): boolean => {
    const errors: Partial<FormData> = {};

    if (camposRequeridos.includes("nombre") && !formData.nombre?.trim()) {
      errors.nombre = "El nombre completo es requerido";
    }

    if (
      camposRequeridos.includes("correoElectronico") &&
      !formData.correoElectronico?.trim()
    ) {
      errors.correoElectronico = "El correo electrónico es requerido";
    } else if (
      camposRequeridos.includes("correoElectronico") &&
      formData.correoElectronico &&
      !/\S+@\S+\.\S+/.test(formData.correoElectronico)
    ) {
      errors.correoElectronico = "El correo electrónico no es válido";
    }

    if (
      camposRequeridos.includes("codigoEstudiante") &&
      !formData.codigoEstudiante?.trim()
    ) {
      errors.codigoEstudiante = "El código de estudiante es requerido";
    }

    setFormErrors(errors);
    console.log("🔍 Validación:", {
      errors,
      valid: Object.keys(errors).length === 0,
    });
    return Object.keys(errors).length === 0;
  };

  // Manejar el inicio del examen
  const handleStartExam = async () => {
    if (!validateForm()) {
      setError("Por favor completa todos los campos requeridos.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Validar contraseña con el backend
      await examsService.validatePassword(examCode, formData.contrasena);

      console.log("✅ Contraseña validada correctamente");

      // Guardar datos en localStorage
      const studentData = {
        nombre: formData.nombre,
        correoElectronico: formData.correoElectronico,
        codigoEstudiante: formData.codigoEstudiante,
        contrasena: formData.contrasena,
        examCode: examCode,
        startTime: new Date().toISOString(),
      };

      localStorage.setItem("studentData", JSON.stringify(studentData));
      localStorage.setItem("currentExam", JSON.stringify(examenData));

      console.log("💾 Datos guardados (sin intento):", studentData);

      // Navegar a exam-solver
      setTimeout(() => {
        navigate("/exam-solver");
      }, 100);
    } catch (error: any) {
      console.error("❌ Error:", error);
      setError(error.message || "Error al validar. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  // Renderizar campo del formulario solo si está en camposRequeridos
  const renderField = (
    key: string,
    fieldKey: keyof FormData,
    label: string,
    type: string = "text",
  ) => {
    // Verificar si el campo está en los campos requeridos
    if (!camposRequeridos.includes(key)) {
      console.log(`⏭️ Campo "${key}" no requerido, saltando...`);
      return null;
    }

    console.log(`✅ Renderizando campo: ${key}`);

    return (
      <div key={key} className="mb-4">
        <label
          className={`block text-sm font-medium mb-2 transition-colors duration-300 ${
            darkMode ? "text-gray-300" : "text-gray-700"
          }`}
        >
          {label}
        </label>
        <input
          type={type}
          value={formData[fieldKey] || ""}
          onChange={(e) => {
            setFormData({ ...formData, [fieldKey]: e.target.value });
            if (formErrors[fieldKey]) {
              setFormErrors({ ...formErrors, [fieldKey]: undefined });
            }
          }}
          onKeyPress={handleKeyPress}
          className={`w-full px-4 py-3 border rounded-lg text-base
                     outline-none transition-all ${
                       darkMode
                         ? "bg-slate-800 border-slate-700 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                         : "bg-white border-gray-300 text-gray-900 focus:border-[#003876] focus:ring-2 focus:ring-[#003876]/20"
                     } ${formErrors[fieldKey] ? "border-red-500" : ""}`}
        />
        {formErrors[fieldKey] && (
          <p
            className={`text-sm mt-1 ${darkMode ? "text-red-400" : "text-red-600"}`}
          >
            {formErrors[fieldKey]}
          </p>
        )}
      </div>
    );
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6 relative bg-cover bg-center transition-all duration-300"
      style={{ backgroundImage: `url(${fondoImagen})` }}
    >
      {/* Overlay ajustable según el tema */}
      <div
        className={`absolute inset-0 backdrop-blur-sm transition-all duration-300 ${
          darkMode
            ? "bg-gradient-to-br from-gray-900/95 via-slate-900/90 to-gray-900/95"
            : "bg-gradient-to-br from-[#003876]/75 via-[#00508f]/70 to-[#003876]/75"
        }`}
      ></div>

      {/* Logo */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 z-10">
        <div className="flex items-center justify-center">
          <img
            src={logoUniversidadNoche}
            alt="Universidad de Ibagué"
            className="h-24 object-contain drop-shadow-lg"
          />
        </div>
      </div>

      {/* Botón de tema */}
      <button
        onClick={toggleTheme}
        className={`fixed bottom-6 right-6 z-20 p-3 rounded-full shadow-lg transition-all duration-300 ${
          darkMode
            ? "bg-slate-800 text-yellow-400 hover:bg-slate-700"
            : "bg-white text-gray-700 hover:bg-gray-100"
        }`}
        title={darkMode ? "Cambiar a modo día" : "Cambiar a modo noche"}
      >
        {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>

      {/* Tarjeta principal */}
      <div
        className={`rounded-2xl shadow-2xl p-6 w-full max-w-2xl z-10 transition-colors duration-300 ${
          darkMode ? "bg-slate-900" : "bg-white"
        }`}
      >
        <div className="text-center mb-5">
          <h2
            className={`text-2xl font-bold mb-1 transition-colors duration-300 ${
              darkMode ? "text-blue-400" : "text-[#003876]"
            }`}
          >
            Estudiante
          </h2>
          <p
            className={`text-sm transition-colors duration-300 ${
              darkMode ? "text-gray-400" : "text-gray-600"
            }`}
          >
            {showForm
              ? "Completa tus datos para continuar"
              : loading
                ? "Verificando código..."
                : "Ingresa el código de 8 caracteres de tu examen"}
          </p>
        </div>

        {/* Paso 1: Ingresar código de 8 caracteres */}
        {!showForm && (
          <>
            <div className="mb-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={examCode}
                  onChange={(e) => setExamCode(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="CÓDIGO"
                  maxLength={8}
                  disabled={loading}
                  className={`flex-1 px-5 py-3 border rounded-lg text-base text-center font-mono text-lg
                             outline-none transition-all ${
                               darkMode
                                 ? "bg-slate-800 border-slate-700 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                 : "bg-white border-gray-300 text-gray-900 focus:border-[#003876] focus:ring-2 focus:ring-[#003876]/20"
                             } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
                />

                <button
                  type="button"
                  onClick={handleSearchCode}
                  disabled={loading}
                  className={`px-8 py-3 rounded-lg text-base font-medium
                             transition-all
                             disabled:opacity-50 disabled:cursor-not-allowed ${
                               darkMode
                                 ? "bg-blue-600 text-white hover:bg-blue-700"
                                 : "bg-[#4a7ba7] text-white hover:bg-[#3d6a93]"
                             }`}
                >
                  {loading ? "Verificando..." : "Acceder"}
                </button>
              </div>
            </div>
          </>
        )}

        {/* Paso 2: Formulario de datos */}
        {showForm && (
          <div className="space-y-4">
            {/* Info del examen encontrado */}
            <div
              className={`p-4 rounded-lg mb-4 ${
                darkMode ? "bg-slate-800" : "bg-gray-50"
              }`}
            >
              <div
                className={`text-sm font-medium mb-1 ${darkMode ? "text-white" : "text-gray-900"}`}
              >
                {examenData?.nombre || "Cargando..."}
              </div>
              <div
                className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-600"}`}
              >
                Código: {examenData?.codigoExamen || "Cargando..."}
              </div>
            </div>

            {/* Campos del formulario */}
            {renderField("nombre", "nombre", "Nombre completo")}
            {renderField(
              "correoElectronico",
              "correoElectronico",
              "Correo electrónico",
              "email",
            )}
            {renderField(
              "codigoEstudiante",
              "codigoEstudiante",
              "Código de estudiante",
            )}

            {renderField(
              "contrasena",
              "contrasena",
              "Contraseña del examen",
              "password",
            )}

            {/* Botón Empezar */}
            <button
              type="button"
              onClick={handleStartExam}
              className={`w-full px-8 py-3 rounded-lg text-base font-medium
                         transition-all mt-6 ${
                           darkMode
                             ? "bg-green-600 text-white hover:bg-green-700"
                             : "bg-green-600 text-white hover:bg-green-700"
                         }`}
            >
              Empezar Examen
            </button>

            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setFormData({});
                setFormErrors({});
                setError("");
                setExamCode("");
                setExamenData(null);
                // Resetear los refs
                hasProcessedUrl.current = false;
                currentCode.current = "";
                // Limpiar el código de la URL
                navigate("/acceso-examen", { replace: true });
              }}
              className={`w-full text-sm ${darkMode ? "text-blue-400 hover:text-blue-300" : "text-[#003876] hover:text-[#003876]/80"}`}
            >
              ← Volver a ingresar código
            </button>
          </div>
        )}

        {/* Mensajes de error */}
        {error && (
          <div
            className={`mb-3 p-3 border rounded-lg flex items-start gap-2 transition-colors duration-300 ${
              darkMode
                ? "bg-red-900/30 border-red-800/50"
                : "bg-red-50 border-red-200"
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full flex-shrink-0 mt-0.5 ${
                darkMode ? "bg-red-600" : "bg-red-500"
              }`}
            ></div>
            <span
              className={`text-sm ${
                darkMode ? "text-red-400" : "text-red-700"
              }`}
            >
              {error}
            </span>
          </div>
        )}

        {!showForm && !loading && (
          <div
            className={`text-center flex items-center justify-center gap-2 transition-colors duration-300 ${
              darkMode ? "text-gray-400" : "text-gray-600"
            }`}
          >
            <svg
              className="w-4 h-4 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-sm">
              Leer más sobre nuestros sistemas de prevención anti-trampas
            </span>
          </div>
        )}
      </div>
    </div>
  );
}