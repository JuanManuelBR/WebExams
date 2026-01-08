// ============================================
// 📁 FRONTEND/src/services/Authservice.ts
// CÓDIGO COMPLETO CON LOGIN DE GOOGLE MEJORADO
// ============================================

import { usersApi } from "./api";
import { 
  getAuth, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup, 
  GoogleAuthProvider,
  updateProfile
} from 'firebase/auth';

// ============================================
// TIPOS
// ============================================

export interface CreateUserPayload {
  nombres: string;
  apellidos: string;
  email: string;
  contrasena: string;
  confirmar_nueva_contrasena: string;
  firebase_uid?: string;
  login_method: 'email' | 'google';
  foto_perfil?: string;
}

export interface BackendUser {
  id: number;
  nombres: string;
  apellidos: string;
  email: string;
  firebase_uid?: string;
  login_method: 'email' | 'google';
  foto_perfil?: string;
}

export interface LocalUser {
  id: number;
  username: string;
  nombre: string;
  apellido: string;
  email: string;
  loginMethod: 'email' | 'google';
  picture: string;
  firebaseUid?: string;
  backendId: number;
}

// ============================================
// FUNCIÓN AUXILIAR: Dividir nombre completo
// ============================================

function splitFullName(fullName: string): { firstName: string, lastName: string } {
  if (!fullName) return { firstName: '', lastName: '' };
  
  const parts = fullName.trim().split(' ').filter(part => part.length > 0);
  
  if (parts.length === 0) {
    return { firstName: 'Usuario', lastName: 'Google' };
  } else if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' };
  } else if (parts.length === 2) {
    return { firstName: parts[0], lastName: parts[1] };
  } else if (parts.length === 3) {
    return { 
      firstName: `${parts[0]} ${parts[1]}`, 
      lastName: parts[2] 
    };
  } else {
    return { 
      firstName: `${parts[0]} ${parts[1]}`, 
      lastName: parts.slice(2).join(' ') 
    };
  }
}

// ============================================
// SERVICIO DE BACKEND (API)
// ============================================

export const usersService = {
  createUser: async (payload: CreateUserPayload): Promise<BackendUser> => {
    try {
      const response = await usersApi.post("/", payload);
      return response.data;
    } catch (error: any) {
      const backendMessage =
        error.response?.data?.message || 
        error.response?.data?.error ||
        error.response?.data?.detail;

      throw new Error(
        backendMessage || error.message || "Error al crear el usuario"
      );
    }
  },

  loginUser: async (email: string, password: string): Promise<{ usuario: BackendUser, token: string }> => {
    try {
      const response = await usersApi.post("/login", {
        email: email,
        contrasena: password
      });
      
      return {
        usuario: response.data.usuario,
        token: response.data.token
      };
    } catch (error: any) {
      const backendMessage =
        error.response?.data?.message || 
        error.response?.data?.error ||
        error.response?.data?.detail;

      throw new Error(
        backendMessage || error.message || "Error al iniciar sesión"
      );
    }
  },

  updateLastAccess: async (userId: number): Promise<void> => {
    try {
      await usersApi.patch(`/${userId}/update-access`);
      console.log('✅ ultimo_acceso actualizado');
    } catch (error) {
      console.error('⚠️ Error actualizando ultimo_acceso:', error);
    }
  },

  getUserByEmail: async (email: string): Promise<BackendUser> => {
    try {
      const response = await usersApi.get(`/email/${email}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new Error('Usuario no encontrado');
      }
      
      const backendMessage =
        error.response?.data?.message || 
        error.response?.data?.error ||
        error.response?.data?.detail;

      throw new Error(
        backendMessage || error.message || "Error al buscar usuario"
      );
    }
  },

  getUserByFirebaseUid: async (firebaseUid: string): Promise<BackendUser> => {
    try {
      const response = await usersApi.get(`/firebase/${firebaseUid}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new Error('Usuario no encontrado');
      }
      
      throw new Error(error.message || "Error al buscar usuario");
    }
  },

  findOrCreateUser: async (payload: CreateUserPayload): Promise<BackendUser> => {
    try {
      const existingUser = await usersService.getUserByEmail(payload.email);
      console.log('✅ Usuario existente encontrado');
      return existingUser;
    } catch (error: any) {
      if (error.message.includes('no encontrado')) {
        console.log('ℹ️ Usuario no existe, creando nuevo...');
        return await usersService.createUser(payload);
      }
      throw error;
    }
  }
};

// ============================================
// SERVICIO DE AUTENTICACIÓN
// ============================================

export const authService = {
  /**
   * REGISTRO CON EMAIL
   */
  registerWithEmail: async (
    auth: ReturnType<typeof getAuth>,
    nombre: string,
    apellido: string,
    email: string,
    password: string
  ): Promise<LocalUser> => {
    let firebaseUser = null;

    try {
      console.log('🔄 [REGISTRO EMAIL] Iniciando...');

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      firebaseUser = userCredential.user;

      await updateProfile(firebaseUser, {
        displayName: `${nombre} ${apellido}`
      });

      console.log('✅ [REGISTRO EMAIL] Usuario creado en Firebase');

      const backendPayload: CreateUserPayload = {
        nombres: nombre,
        apellidos: apellido,
        email: email,
        contrasena: password,
        confirmar_nueva_contrasena: password,
        firebase_uid: firebaseUser.uid,
        login_method: 'email'
      };

      const backendUser = await usersService.createUser(backendPayload);
      console.log('✅ [REGISTRO EMAIL] Usuario creado en MySQL');

      const localUser: LocalUser = {
        id: backendUser.id,
        backendId: backendUser.id,
        firebaseUid: firebaseUser.uid,
        username: email,
        nombre: nombre,
        apellido: apellido,
        email: email,
        loginMethod: 'email',
        picture: backendUser.foto_perfil || ''
      };

      localStorage.setItem('usuario', JSON.stringify(localUser));
      
      return localUser;

    } catch (error: any) {
      console.error('❌ [REGISTRO EMAIL] Error:', error);

      if (firebaseUser && 
          (error.message.includes('ya está en uso') || 
           error.message.includes('ya existe'))) {
        try {
          await firebaseUser.delete();
        } catch (deleteError) {
          console.error('⚠️ Error en rollback:', deleteError);
        }
      }

      if (error.message.includes('ya está en uso') || 
          error.message.includes('ya existe')) {
        throw new Error('Este correo electrónico ya está registrado');
      } else if (error.code === 'auth/email-already-in-use') {
        throw new Error('Este correo electrónico ya está registrado');
      } else if (error.code === 'auth/weak-password') {
        throw new Error('La contraseña es muy débil (mínimo 6 caracteres)');
      }
      
      throw error;
    }
  },

  /**
   * REGISTRO CON GOOGLE
   */
  registerWithGoogle: async (
    auth: ReturnType<typeof getAuth>,
    googleProvider: GoogleAuthProvider
  ): Promise<LocalUser> => {
    try {
      console.log('🔄 [REGISTRO GOOGLE] Iniciando...');

      const result = await signInWithPopup(auth, googleProvider);
      const firebaseUser = result.user;

      const fullName = firebaseUser.displayName || '';
      const { firstName, lastName } = splitFullName(fullName);
      const email = firebaseUser.email || '';

      console.log('✅ [REGISTRO GOOGLE] Autenticado');

      const backendPayload: CreateUserPayload = {
        nombres: firstName || 'Usuario',
        apellidos: lastName || 'Google',
        email: email,
        contrasena: `google-oauth-${firebaseUser.uid}`,
        confirmar_nueva_contrasena: `google-oauth-${firebaseUser.uid}`,
        firebase_uid: firebaseUser.uid,
        login_method: 'google',
        foto_perfil: firebaseUser.photoURL || undefined
      };

      const backendUser = await usersService.findOrCreateUser(backendPayload);
      console.log('✅ [REGISTRO GOOGLE] Usuario en MySQL');

      // Actualizar ultimo_acceso
      try {
        await usersService.updateLastAccess(backendUser.id);
      } catch (error) {
        console.warn('⚠️ No se pudo actualizar ultimo_acceso:', error);
      }

      const localUser: LocalUser = {
        id: backendUser.id,
        backendId: backendUser.id,
        firebaseUid: firebaseUser.uid,
        username: email,
        nombre: backendUser.nombres,
        apellido: backendUser.apellidos,
        email: email,
        loginMethod: 'google',
        picture: firebaseUser.photoURL || backendUser.foto_perfil || ''
      };

      localStorage.setItem('usuario', JSON.stringify(localUser));
      
      return localUser;

    } catch (error: any) {
      console.error('❌ [REGISTRO GOOGLE] Error:', error);
      
      if (error.code === 'auth/popup-closed-by-user') {
        throw new Error('Autenticación cancelada');
      } else if (error.code === 'auth/popup-blocked') {
        throw new Error('Popup bloqueado');
      }
      
      throw error;
    }
  },

  /**
   * LOGIN CON EMAIL
   */
  loginWithEmail: async (
    auth: ReturnType<typeof getAuth>,
    email: string,
    password: string
  ): Promise<LocalUser> => {
    try {
      console.log('🔄 [LOGIN EMAIL] Iniciando...');

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      console.log('✅ [LOGIN EMAIL] Autenticado en Firebase');

      let backendUser: BackendUser;
      
      try {
        const loginResponse = await usersService.loginUser(email, password);
        backendUser = loginResponse.usuario;
        console.log('✅ [LOGIN EMAIL] Login backend - Cookie obtenida');
      } catch (backendError: any) {
        console.warn('⚠️ Login backend falló, buscando usuario...');
        
        try {
          backendUser = await usersService.getUserByFirebaseUid(firebaseUser.uid);
        } catch (error) {
          backendUser = await usersService.getUserByEmail(email);
        }
      }

      const localUser: LocalUser = {
        id: backendUser.id,
        backendId: backendUser.id,
        firebaseUid: firebaseUser.uid,
        username: email,
        nombre: backendUser.nombres,
        apellido: backendUser.apellidos,
        email: email,
        loginMethod: 'email',
        picture: firebaseUser.photoURL || backendUser.foto_perfil || ''
      };

      localStorage.setItem('usuario', JSON.stringify(localUser));
      
      return localUser;

    } catch (error: any) {
      console.error('❌ [LOGIN EMAIL] Error:', error);
      
      if (error.code === 'auth/user-not-found') {
        throw new Error('Usuario no encontrado');
      } else if (error.code === 'auth/wrong-password') {
        throw new Error('Contraseña incorrecta');
      } else if (error.code === 'auth/invalid-credential') {
        throw new Error('Credenciales inválidas');
      }
      
      throw error;
    }
  },

  /**
   * LOGIN CON GOOGLE - ACTUALIZADO CON COOKIE
   */
  loginWithGoogle: async (
    auth: ReturnType<typeof getAuth>,
    googleProvider: GoogleAuthProvider
  ): Promise<LocalUser> => {
    try {
      console.log('🔄 [LOGIN GOOGLE] Iniciando...');

      const result = await signInWithPopup(auth, googleProvider);
      const firebaseUser = result.user;

      const email = firebaseUser.email || '';

      console.log('✅ [LOGIN GOOGLE] Autenticado');

      let backendUser: BackendUser;
      
      try {
        backendUser = await usersService.getUserByFirebaseUid(firebaseUser.uid);
      } catch (error) {
        try {
          backendUser = await usersService.getUserByEmail(email);
        } catch (emailError) {
          await auth.signOut();
          throw new Error('Usuario no registrado. Por favor regístrate primero');
        }
      }

      console.log('✅ [LOGIN GOOGLE] Usuario encontrado');

      // ✅ NUEVO: Hacer login en el backend para obtener la cookie
      try {
        const tempPassword = `google-oauth-${firebaseUser.uid}`;
        await usersService.loginUser(email, tempPassword);
        console.log('✅ [LOGIN GOOGLE] Cookie obtenida del backend');
      } catch (loginError) {
        console.warn('⚠️ No se pudo hacer login en backend, actualizando último acceso manualmente');
        await usersService.updateLastAccess(backendUser.id);
      }

      const localUser: LocalUser = {
        id: backendUser.id,
        backendId: backendUser.id,
        firebaseUid: firebaseUser.uid,
        username: email,
        nombre: backendUser.nombres,
        apellido: backendUser.apellidos,
        email: email,
        loginMethod: 'google',
        picture: firebaseUser.photoURL || backendUser.foto_perfil || ''
      };

      localStorage.setItem('usuario', JSON.stringify(localUser));
      
      return localUser;

    } catch (error: any) {
      console.error('❌ [LOGIN GOOGLE] Error:', error);
      
      if (error.code === 'auth/popup-closed-by-user') {
        throw new Error('Autenticación cancelada');
      }
      
      throw error;
    }
  },

  getCurrentUser: (): LocalUser | null => {
    try {
      const userStr = localStorage.getItem('usuario');
      if (!userStr) return null;
      
      return JSON.parse(userStr) as LocalUser;
    } catch (error) {
      return null;
    }
  },

  logout: async (auth: ReturnType<typeof getAuth>): Promise<void> => {
    try {
      await auth.signOut();
      localStorage.removeItem('usuario');
      console.log('✅ [LOGOUT] Sesión cerrada');
    } catch (error) {
      localStorage.removeItem('usuario');
    }
  }
};