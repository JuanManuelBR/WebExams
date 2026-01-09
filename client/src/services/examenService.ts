// services/examenService.ts
// Servicio simplificado sin ID interno - solo usa código de 6 caracteres

export interface DatosExamen {
  nombreExamen: string;
  descripcionExamen: string;
  tipoPregunta: 'no-digital' | 'pdf' | 'escribir' | 'automatico';
  archivoPDF?: File | null;
  archivoPDFBase64?: string;
  nombreArchivoPDF?: string;
  preguntasEscritas?: string;
  preguntasAutomaticas?: any[];
  camposActivos: Array<{ id: string; nombre: string }>;
  fechaInicio: string | null;
  fechaCierre: string | null;
  limiteTiempo: { valor: number; unidad: 'minutos' } | null;
  opcionTiempoAgotado: string;
  seguridad: {
    contraseña: string; // Contraseña de 6 caracteres
    consecuenciaAbandono: string;
  };
  herramientasActivas: string[];
}

export interface ExamenGuardado extends DatosExamen {
  codigoExamen: string; // Código único de 6 caracteres (identificador principal)
  fechaCreacion: string;
  profesorId: string;
  profesorNombre: string;
}

// Generar código/contraseña de examen (6 caracteres)
function generarCodigoExamen(): string {
  const mayusculas = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const minusculas = 'abcdefghijklmnopqrstuvwxyz';
  const numeros = '0123456789';
  const simbolos = '!@#$%&*';
  const todos = mayusculas + minusculas + numeros + simbolos;

  let codigo = '';
  // Asegurar al menos un carácter de cada tipo
  codigo += mayusculas[Math.floor(Math.random() * mayusculas.length)];
  codigo += minusculas[Math.floor(Math.random() * minusculas.length)];
  codigo += numeros[Math.floor(Math.random() * numeros.length)];
  codigo += simbolos[Math.floor(Math.random() * simbolos.length)];

  // Completar hasta 6 caracteres
  for (let i = 4; i < 6; i++) {
    codigo += todos[Math.floor(Math.random() * todos.length)];
  }

  // Mezclar los caracteres
  return codigo.split('').sort(() => Math.random() - 0.5).join('');
}

// Verificar si un código ya existe
function codigoExiste(codigo: string): boolean {
  const examenes = obtenerTodosLosExamenes();
  return examenes.some(e => e.codigoExamen === codigo);
}

// Generar código único
function generarCodigoUnico(): string {
  let codigo = generarCodigoExamen();
  while (codigoExiste(codigo)) {
    codigo = generarCodigoExamen();
  }
  return codigo;
}

// Convertir File a Base64
async function convertirArchivoABase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ==================== FUNCIONES PRINCIPALES ====================

/**
 * Crear un nuevo examen
 */
export async function crearExamen(datosExamen: DatosExamen): Promise<{
  success: boolean;
  codigoExamen: string;
  url: string;
  mensaje?: string;
  error?: string;
}> {
  try {
    // Simular delay de red
    await new Promise(resolve => setTimeout(resolve, 1500));

    // El código de 6 caracteres ya viene en datosExamen.seguridad.contraseña
    // O lo generamos si está vacío
    let codigoExamen = datosExamen.seguridad.contraseña;
    if (!codigoExamen || codigoExamen.length !== 6) {
      codigoExamen = generarCodigoUnico();
    }

    // Convertir PDF a base64 si existe
    let archivoPDFBase64 = datosExamen.archivoPDFBase64;
    if (datosExamen.archivoPDF && !archivoPDFBase64) {
      archivoPDFBase64 = await convertirArchivoABase64(datosExamen.archivoPDF);
    }

    // Preparar examen para guardar
    const examenGuardado: ExamenGuardado = {
      ...datosExamen,
      codigoExamen,
      fechaCreacion: new Date().toISOString(),
      profesorId: obtenerUsuarioActual()?.id || 'demo_user',
      profesorNombre: obtenerUsuarioActual()?.nombre || 'Profesor Demo',
      archivoPDFBase64,
      archivoPDF: undefined,
      seguridad: {
        ...datosExamen.seguridad,
        contraseña: codigoExamen
      }
    };

    // Guardar en localStorage
    const examenes = obtenerTodosLosExamenes();
    examenes.push(examenGuardado);
    localStorage.setItem('examenes', JSON.stringify(examenes));

    console.log('Examen guardado:', examenGuardado);
    console.log('Total de exámenes:', examenes.length);

    // Generar URL con codificación correcta
    const baseUrl = window.location.origin;
    const url = `${baseUrl}/acceso-examen?code=${encodeURIComponent(codigoExamen)}`;

    return {
      success: true,
      codigoExamen,
      url,
      mensaje: 'Examen creado exitosamente'
    };

  } catch (error: any) {
    console.error('Error al crear examen:', error);
    return {
      success: false,
      codigoExamen: '',
      url: '',
      error: error.message || 'Error al crear el examen'
    };
  }
}

/**
 * Obtener todos los exámenes
 */
export function obtenerTodosLosExamenes(): ExamenGuardado[] {
  try {
    const examenes = localStorage.getItem('examenes');
    const resultado = examenes ? JSON.parse(examenes) : [];
    console.log('Exámenes recuperados del localStorage:', resultado);
    return resultado;
  } catch (error) {
    console.error('Error al obtener exámenes:', error);
    return [];
  }
}

/**
 * Obtener examen por código (identificador único)
 */
export function obtenerExamenPorCodigo(codigo: string): ExamenGuardado | null {
  const examenes = obtenerTodosLosExamenes();
  return examenes.find(e => e.codigoExamen === codigo) || null;
}

/**
 * Obtener exámenes del usuario actual
 */
export function obtenerMisExamenes(): ExamenGuardado[] {
  const usuarioActual = obtenerUsuarioActual();
  console.log('Usuario actual:', usuarioActual);

  if (!usuarioActual) {
    console.warn('No hay usuario actual');
    return [];
  }

  const todosLosExamenes = obtenerTodosLosExamenes();
  console.log('Todos los exámenes:', todosLosExamenes);

  const misExamenes = todosLosExamenes.filter(e => {
    console.log(`Comparando: ${e.profesorId} === ${usuarioActual.id}`, e.profesorId === usuarioActual.id);
    return e.profesorId === usuarioActual.id;
  });

  console.log('Mis exámenes filtrados:', misExamenes);
  return misExamenes;
}

/**
 * Eliminar examen por código
 */
export function eliminarExamen(codigo: string): boolean {
  try {
    const examenes = obtenerTodosLosExamenes();
    const nuevosExamenes = examenes.filter(e => e.codigoExamen !== codigo);
    localStorage.setItem('examenes', JSON.stringify(nuevosExamenes));
    console.log('Examen eliminado. Total restante:', nuevosExamenes.length);
    return true;
  } catch (error) {
    console.error('Error al eliminar examen:', error);
    return false;
  }
}

/**
 * Actualizar examen
 */
export async function actualizarExamen(codigo: string, datosActualizados: Partial<DatosExamen>): Promise<boolean> {
  try {
    const examenes = obtenerTodosLosExamenes();
    const index = examenes.findIndex(e => e.codigoExamen === codigo);

    if (index === -1) return false;

    // Convertir PDF a base64 si hay uno nuevo
    if (datosActualizados.archivoPDF) {
      datosActualizados.archivoPDFBase64 = await convertirArchivoABase64(datosActualizados.archivoPDF);
      datosActualizados.archivoPDF = undefined;
    }

    examenes[index] = {
      ...examenes[index],
      ...datosActualizados
    };

    localStorage.setItem('examenes', JSON.stringify(examenes));
    return true;
  } catch (error) {
    console.error('Error al actualizar examen:', error);
    return false;
  }
}

/**
 * Actualizar código de examen (cambiar el identificador principal)
 */
export function actualizarCodigoExamen(codigoActual: string, nuevoCodigo: string): boolean {
  try {
    // Validar que el código tenga 6 caracteres
    if (nuevoCodigo.length !== 6) {
      console.error('El código debe tener exactamente 6 caracteres');
      return false;
    }

    // Verificar que el nuevo código no exista
    if (codigoExiste(nuevoCodigo)) {
      console.error('El código ya existe');
      return false;
    }

    const examenes = obtenerTodosLosExamenes();
    const index = examenes.findIndex(e => e.codigoExamen === codigoActual);

    if (index === -1) return false;

    examenes[index].codigoExamen = nuevoCodigo;
    examenes[index].seguridad.contraseña = nuevoCodigo;
    localStorage.setItem('examenes', JSON.stringify(examenes));
    return true;
  } catch (error) {
    console.error('Error al actualizar código:', error);
    return false;
  }
}

// ==================== GESTIÓN DE USUARIO ====================

interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: 'profesor' | 'estudiante';
}

export function obtenerUsuarioActual(): Usuario | null {
  try {
    const usuario = localStorage.getItem('usuario');
    return usuario ? JSON.parse(usuario) : null;
  } catch (error) {
    return null;
  }
}

export function establecerUsuario(usuario: Usuario): void {
  localStorage.setItem('usuario', JSON.stringify(usuario));
}

export function cerrarSesion(): void {
  localStorage.removeItem('usuario');
}

// ==================== ESTADÍSTICAS ====================

export interface EstadisticasExamen {
  totalExamenes: number;
  examenesActivos: number;
  totalIntentos: number;
  promedioCalificacion: number;
}

export function obtenerEstadisticas(): EstadisticasExamen {
  const examenes = obtenerMisExamenes();

  return {
    totalExamenes: examenes.length,
    examenesActivos: examenes.length,
    totalIntentos: 0,
    promedioCalificacion: 0
  };
}

// ==================== INICIALIZACIÓN ====================

export function inicializarUsuarioDemo(): void {
  if (!obtenerUsuarioActual()) {
    const usuarioDemo = {
      id: 'demo_user',
      nombre: 'Profesor Demo',
      email: 'demo@ejemplo.com',
      rol: 'profesor' as const
    };
    establecerUsuario(usuarioDemo);
    console.log('Usuario demo inicializado:', usuarioDemo);
  }
}

// ==================== EXPORTAR/IMPORTAR ====================

export function exportarExamenes(): string {
  const examenes = obtenerTodosLosExamenes();
  return JSON.stringify(examenes, null, 2);
}

export function importarExamenes(jsonString: string): boolean {
  try {
    const examenes = JSON.parse(jsonString);
    localStorage.setItem('examenes', JSON.stringify(examenes));
    return true;
  } catch (error) {
    console.error('Error al importar exámenes:', error);
    return false;
  }
}

export function limpiarTodosDatos(): void {
  localStorage.removeItem('examenes');
  localStorage.removeItem('usuario');
}