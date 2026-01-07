// config/storageConfig.ts
// Configuración para cambiar fácilmente entre localStorage y API en el futuro

export const STORAGE_CONFIG = {
  // Cambiar a 'api' cuando tengas el backend listo
  mode: 'localStorage' as 'localStorage' | 'api',
  
  // URLs de los microservicios (para cuando estén listos)
  apiUrls: {
    auth: 'http://localhost:3001',
    examen: 'http://localhost:3002',
    respuesta: 'http://localhost:3003',
    file: 'http://localhost:3004',
  },
  
  // Configuración de localStorage (actual)
  localStorageKeys: {
    examenes: 'examenes',
    usuario: 'usuario',
    darkMode: 'darkMode',
    studentData: 'studentData',
    currentExam: 'currentExam',
  }
};

// Helper para determinar si estamos usando API o localStorage
export const usingAPI = () => STORAGE_CONFIG.mode === 'api';
export const usingLocalStorage = () => STORAGE_CONFIG.mode === 'localStorage';