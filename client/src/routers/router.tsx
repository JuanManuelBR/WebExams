import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import LoginPage from "../pages/LoginPage";
import RegisterPage from "../pages/RegisterPage";
import PrincipalPage from "../pages/PrincipalPage";
import ExamAccessPage from "../pages/ExamAccessPage";
import ExamSolver from "../pages/ExamSolver";

// Componente para proteger rutas
function RutaProtegida({ children }: { children: React.ReactNode }) {
  const usuario = localStorage.getItem('usuario');
  
  // Si no hay usuario, redirige al login
  if (!usuario) {
    return <Navigate to="/teacher-login" replace />;
  }
  
  // Si hay usuario, muestra la página
  return <>{children}</>;
}

export function MyRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Ruta del Login (pública) */}
        <Route path="/teacher-login" element={<LoginPage />} />
        
        {/* Ruta del Registro (pública) */}
        <Route path="/teacher-registration" element={<RegisterPage />} />
        
        {/* Ruta de Acceso a Examen (pública) */}
        <Route path="/acceso-examen" element={<ExamAccessPage />} />
        
        {/* Ruta del Examen (pública) - NUEVA */}
        <Route path="/exam-solver" element={<ExamSolver />} />
        
        {/* Ruta Principal (protegida) */}
        <Route 
          path="/" 
          element={
            <RutaProtegida>
              <PrincipalPage />
            </RutaProtegida>
          } 
        />
        
        {/* Cualquier otra ruta redirige al login */}
        <Route path="*" element={<Navigate to="/teacher-login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}