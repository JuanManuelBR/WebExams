import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Moon, Sun, RotateCcw, ChevronLeft } from "lucide-react";
import logoUniversidadNoche from "../../assets/logo-universidad-noche.webp";
import fondoImagen from "../../assets/fondo.webp";
import { examsService } from "../services/examsService";
import { examsAttemptsService } from "../services/examsAttempts";

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
  const [mode, setMode] = useState<"exam" | "resume" | "revision">("exam");
  const [examCode, setExamCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<FormData>({});
  const [formErrors, setFormErrors] = useState<Partial<FormData>>({});
  const [camposRequeridos, setCamposRequeridos] = useState<string[]>([]);
  const [examenData, setExamenData] = useState<any>(null);

  // Estado para reanudar intento
  const [resumeCode, setResumeCode] = useState("");
  const [resumeError, setResumeError] = useState("");

  // Estado para revisar calificación
  const [revisionCode, setRevisionCode] = useState("");
  const [revisionError, setRevisionError] = useState("");

  // Usar useRef para prevenir ejecución múltiple
  const hasProcessedUrl = useRef(false);
  const currentCode = useRef<string>("");

  // Estado para el modo oscuro - lee desde localStorage al iniciar
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("darkMode");
    return saved ? JSON.parse(saved) : false;
  });

  // Guardar preferencia y aplicar clase al <html>
  useEffect(() => {
    localStorage.setItem("darkMode", JSON.stringify(darkMode));
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  const toggleTheme = () => {
    setDarkMode(!darkMode);
  };

  // Iniciar examen - useCallback para evitar recreación
  const iniciarExamen = useCallback(
    (examen: any, datos: FormData = {}) => {
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

      const rutaExamen = "/exam-solver";

      // Usar setTimeout para asegurar que localStorage se guarde antes de navegar
      setTimeout(() => {
        navigate(rutaExamen, { replace: true });
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
          if (examen.estado === "closed") {
            setError("El examen no aún no está abierto.");
            setLoading(false);
            return;
          }
          setExamenData(examen);

          const campos = obtenerCamposRequeridos(examen);
          setCamposRequeridos(campos);

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

      // Validar duplicados antes de navegar
      await examsAttemptsService.checkDuplicate({
        codigo_examen: examCode,
        correo_estudiante: formData.correoElectronico || undefined,
        identificacion_estudiante: formData.codigoEstudiante || undefined,
      });

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

      // Navegar a exam-solver (replace para no dejar /exam-solver en historial)
      setTimeout(() => {
        navigate("/exam-solver", { replace: true });
      }, 100);
    } catch (error: any) {
      console.error("❌ Error:", error);
      setError(error?.response?.data?.message || error.message || "Error al validar. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  // Reanudar un intento abandonado
  const handleResume = async () => {
    setResumeError("");
    if (!resumeCode.trim()) {
      setResumeError("Ingresa el código de acceso que te dio el profesor.");
      return;
    }
    setLoading(true);
    try {
      const result = await examsAttemptsService.resumeAttempt({ codigo_acceso: resumeCode.trim() });
      const { attempt, examInProgress, exam } = result;

      const studentData = {
        examCode: exam.codigoExamen,
        attemptId: attempt.id,
        codigo_acceso: examInProgress.codigo_acceso,
        id_sesion: examInProgress.id_sesion,
        fecha_expiracion: examInProgress.fecha_expiracion ?? null,
        isResuming: true,
        nombre: attempt.nombre_estudiante || undefined,
        correoElectronico: attempt.correo_estudiante || undefined,
        codigoEstudiante: attempt.identificacion_estudiante || undefined,
        ordenPreguntas: attempt.ordenPreguntas || null,
      };

      localStorage.setItem("studentData", JSON.stringify(studentData));
      localStorage.setItem("currentExam", JSON.stringify(exam));
      localStorage.removeItem("examBlockedState");

      // Guardar respuestas previas para que ExamSolver las restaure
      if (attempt.respuestas && attempt.respuestas.length > 0) {
        localStorage.setItem("savedAnswers", JSON.stringify(attempt.respuestas));
      } else {
        localStorage.removeItem("savedAnswers");
      }

      setTimeout(() => navigate("/exam-solver", { replace: true }), 100);
    } catch (err: any) {
      setResumeError(err?.response?.data?.message || err.message || "Código de acceso inválido o intento no reanudable.");
    } finally {
      setLoading(false);
    }
  };

  const handleRevision = () => {
    setRevisionError("");
    if (!revisionCode.trim()) {
      setRevisionError("Ingresa el código de revisión de tu examen.");
      return;
    }
    localStorage.setItem("revisionCode", revisionCode.trim());
    navigate("/exam-feedback", { replace: true });
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
      return null;
    }

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
      className="min-h-screen flex items-center justify-center pt-24 md:pt-6 p-4 md:p-6 relative bg-cover bg-center transition-all duration-300 overflow-x-hidden"
      style={{ backgroundImage: `url(${fondoImagen})` }}
    >
      {/* Overlay — mismo estilo que LandingPage */}
      <div
        className={`absolute inset-0 z-0 transition-all duration-500 ${
          darkMode
            ? "bg-gradient-to-b from-slate-950/90 via-slate-900/80 to-slate-950/90 backdrop-blur-[3px]"
            : "bg-gradient-to-b from-sky-950/55 via-sky-900/30 to-sky-950/55 backdrop-blur-[5px]"
        }`}
      />

      {/* Logo */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 z-10">
        <div className="flex items-center justify-center">
          <img
            src={logoUniversidadNoche}
            alt="Universidad de Ibagué"
            className="h-14 md:h-24 object-contain drop-shadow-lg"
          />
        </div>
      </div>

      {/* Botón volver a inicio */}
      <button
        onClick={() => navigate("/")}
        className={`fixed top-6 left-6 z-20 flex items-center gap-2 px-4 py-2.5 rounded-full shadow-xl border transition-all duration-300 hover:scale-105 text-sm font-medium ${
          darkMode
            ? "bg-slate-800/80 backdrop-blur-xl border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
            : "bg-white/90 backdrop-blur-sm border-slate-200 text-slate-600 shadow-slate-300/60 hover:bg-white hover:text-slate-900"
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
            ? "bg-slate-800/80 backdrop-blur-xl border-slate-600 text-yellow-400 hover:bg-slate-700"
            : "bg-white/90 backdrop-blur-sm border-slate-200 text-slate-600 shadow-slate-300/60 hover:bg-white"
        }`}
        title={darkMode ? "Cambiar a modo día" : "Cambiar a modo noche"}
      >
        {darkMode ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
      </button>

      {/* Tarjeta principal */}
      <div
        className={`rounded-2xl shadow-2xl p-4 sm:p-6 w-full max-w-2xl z-10 transition-colors duration-300 anim-scaleIn ${
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
        </div>

        {/* Tabs: Iniciar examen / Reanudar intento / Revisar calificación */}
        {!showForm && (
          <div className={`grid grid-cols-3 rounded-xl p-1 mb-5 gap-1 ${darkMode ? "bg-slate-800" : "bg-gray-100"}`}>
            <button
              onClick={() => { setMode("exam"); setError(""); setResumeError(""); setRevisionError(""); }}
              className={`py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-200 leading-tight ${
                mode === "exam"
                  ? darkMode ? "bg-slate-700 text-white shadow" : "bg-white text-[#003876] shadow"
                  : darkMode ? "text-gray-400 hover:text-gray-200" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Iniciar examen
            </button>
            <button
              onClick={() => { setMode("resume"); setError(""); setResumeError(""); setRevisionError(""); }}
              className={`py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-1 leading-tight ${
                mode === "resume"
                  ? darkMode ? "bg-slate-700 text-white shadow" : "bg-white text-[#003876] shadow"
                  : darkMode ? "text-gray-400 hover:text-gray-200" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <RotateCcw className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
              <span>Reanudar</span>
            </button>
            <button
              onClick={() => { setMode("revision"); setError(""); setResumeError(""); setRevisionError(""); }}
              className={`py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-200 leading-tight ${
                mode === "revision"
                  ? darkMode ? "bg-slate-700 text-white shadow" : "bg-white text-[#003876] shadow"
                  : darkMode ? "text-gray-400 hover:text-gray-200" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Revisar calificación
            </button>
          </div>
        )}

        {/* Contenido del tab — key en el wrapper dispara anim-fadeIn al cambiar de modo */}
        {!showForm && (
          <div key={mode} className="anim-fadeIn">

            {/* Paso 1: Ingresar código de examen */}
            {mode === "exam" && (
              <>
                <p className={`text-sm text-center mb-3 ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                  {loading ? "Verificando código..." : "Ingresa el código de 8 caracteres de tu examen"}
                </p>
                <div className="mb-3">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={examCode}
                      onChange={(e) => setExamCode(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !loading && handleSearchCode()}
                      placeholder="CÓDIGO"
                      maxLength={8}
                      disabled={loading}
                      className={`w-full px-5 py-3 border rounded-lg text-base text-center font-mono text-lg
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
                      className={`w-full sm:w-auto px-8 py-3 rounded-lg text-base font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                        darkMode ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-[#4a7ba7] text-white hover:bg-[#3d6a93]"
                      }`}
                    >
                      {loading ? "Verificando..." : "Acceder"}
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Reanudar intento abandonado */}
            {mode === "resume" && (
              <>
                <p className={`text-sm text-center mb-3 ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                  Ingresa el código de acceso que te proporcionó el profesor
                </p>
                <div className="mb-3">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={resumeCode}
                      onChange={(e) => setResumeCode(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !loading && handleResume()}
                      placeholder="CÓDIGO DE ACCESO"
                      maxLength={10}
                      disabled={loading}
                      className={`w-full px-5 py-3 border rounded-lg text-base text-center font-mono text-lg
                                 outline-none transition-all ${
                                   darkMode
                                     ? "bg-slate-800 border-slate-700 text-white placeholder-gray-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                                     : "bg-white border-gray-300 text-gray-900 focus:border-amber-600 focus:ring-2 focus:ring-amber-600/20"
                                 } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
                    />
                    <button
                      type="button"
                      onClick={handleResume}
                      disabled={loading}
                      className={`w-full sm:w-auto px-8 py-3 rounded-lg text-base font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                        darkMode ? "bg-amber-600 text-white hover:bg-amber-700" : "bg-amber-600 text-white hover:bg-amber-700"
                      }`}
                    >
                      {loading ? "Verificando..." : "Reanudar"}
                    </button>
                  </div>
                </div>
                {resumeError && (
                  <div className={`mb-3 p-3 border rounded-lg flex items-start gap-2 ${
                    darkMode ? "bg-red-900/30 border-red-800/50" : "bg-red-50 border-red-200"
                  }`}>
                    <div className={`w-4 h-4 rounded-full flex-shrink-0 mt-0.5 ${darkMode ? "bg-red-600" : "bg-red-500"}`} />
                    <span className={`text-sm ${darkMode ? "text-red-400" : "text-red-700"}`}>{resumeError}</span>
                  </div>
                )}
              </>
            )}

            {/* Revisar calificación */}
            {mode === "revision" && (
              <>
                <p className={`text-sm text-center mb-3 ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                  Ingresa el código de revisión para ver tu calificación y retroalimentación
                </p>
                <div className="mb-3">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={revisionCode}
                      onChange={(e) => setRevisionCode(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !loading && handleRevision()}
                      placeholder="CÓDIGO DE REVISIÓN"
                      maxLength={10}
                      disabled={loading}
                      className={`w-full px-5 py-3 border rounded-lg text-base text-center font-mono text-lg
                                 outline-none transition-all ${
                                   darkMode
                                     ? "bg-slate-800 border-slate-700 text-white placeholder-gray-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                                     : "bg-white border-gray-300 text-gray-900 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20"
                                 } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
                    />
                    <button
                      type="button"
                      onClick={handleRevision}
                      disabled={loading}
                      className={`w-full sm:w-auto px-8 py-3 rounded-lg text-base font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                        darkMode ? "bg-teal-600 text-white hover:bg-teal-700" : "bg-teal-600 text-white hover:bg-teal-700"
                      }`}
                    >
                      Ver calificación
                    </button>
                  </div>
                </div>
                {revisionError && (
                  <div className={`mb-3 p-3 border rounded-lg flex items-start gap-2 ${
                    darkMode ? "bg-red-900/30 border-red-800/50" : "bg-red-50 border-red-200"
                  }`}>
                    <div className={`w-4 h-4 rounded-full flex-shrink-0 mt-0.5 ${darkMode ? "bg-red-600" : "bg-red-500"}`} />
                    <span className={`text-sm ${darkMode ? "text-red-400" : "text-red-700"}`}>{revisionError}</span>
                  </div>
                )}
              </>
            )}

          </div>
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
                navigate("/exam-access", { replace: true });
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