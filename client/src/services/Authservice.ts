import { usersApi } from "./api";
import { 
  getAuth, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup, 
  GoogleAuthProvider,
  updateProfile
} from 'firebase/auth';

// Tipos
export interface CreateUserPayload {
  nombres: string;
  apellidos: string;
  email: string;
  contrasena: string;
  confirmar_nueva_contrasena: string;
}

export interface BackendUser {
  id: string;
  primer_nombre: string;
  primer_apellido: string;
  email: string;
}

export interface LocalUser {
  id: string;
  username: string;
  nombre: string;
  apellido: string;
  email: string;
  loginMethod: 'email' | 'google';
  picture: string;
  firebaseUid?: string;
  backendId?: string;
}

// Servicio de usuarios para el backend
export const usersService = {
  // Crear usuario en el backend
  createUser: async (payload: CreateUserPayload): Promise<BackendUser> => {
    try {
      const response = await usersApi.post("/", payload);
      return response.data;
    } catch (error: any) {
      if (error.response) {
        console.error("Error del servidor:", error.response.data);
      } else if (error.request) {
        console.error("No se recibió respuesta del servidor");
      } else {
        console.error("Error:", error.message);
      }

      const backendMessage =
        error.response?.data?.message || 
        error.response?.data?.error ||
        error.response?.data?.detail;

      throw new Error(
        backendMessage || error.message || "Error al crear el usuario"
      );
    }
  },

  // Login con email y contraseña
  loginUser: async (email: string, password: string): Promise<BackendUser> => {
    try {
      const response = await usersApi.post("/login", {
        email: email,
        contrasena: password
      });
      return response.data;
    } catch (error: any) {
      if (error.response) {
        console.error("Error del servidor:", error.response.data);
      } else if (error.request) {
        console.error("No se recibió respuesta del servidor");
      } else {
        console.error("Error:", error.message);
      }

      const backendMessage =
        error.response?.data?.message || 
        error.response?.data?.error ||
        error.response?.data?.detail;

      throw new Error(
        backendMessage || error.message || "Error al iniciar sesión"
      );
    }
  }
};

// Servicio de autenticación - SOLO REGISTRO
export const authService = {
  /**
   * Registrar usuario con email y contraseña
   * Crea el usuario en Backend primero, luego en Firebase
   */
  registerWithEmail: async (
    auth: ReturnType<typeof getAuth>,
    nombre: string,
    apellido: string,
    email: string,
    password: string
  ): Promise<LocalUser> => {
    try {
      console.log('🔄 Iniciando registro con email...');

      // PASO 1: Crear usuario en el backend primero
      const backendPayload: CreateUserPayload = {
        nombres: nombre,
        apellidos: apellido,
        email: email,
        contrasena: password,
        confirmar_nueva_contrasena: password
      };

      console.log('📤 Enviando datos al backend...');
      const backendUser = await usersService.createUser(backendPayload);
      console.log('✅ Usuario creado en backend:', backendUser.id);

      // PASO 2: Crear usuario en Firebase
      console.log('📤 Creando usuario en Firebase...');
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const firebaseUser = userCredential.user;
      console.log('✅ Usuario creado en Firebase:', firebaseUser.uid);

      // PASO 3: Actualizar perfil de Firebase con el nombre
      await updateProfile(firebaseUser, {
        displayName: `${nombre} ${apellido}`
      });
      console.log('✅ Perfil de Firebase actualizado');

      // PASO 4: Crear objeto de usuario para localStorage
      const localUser: LocalUser = {
        id: backendUser.id,
        backendId: backendUser.id,
        firebaseUid: firebaseUser.uid,
        username: email,
        nombre: nombre,
        apellido: apellido,
        email: email,
        loginMethod: 'email',
        picture: ''
      };

      // PASO 5: Guardar en localStorage
      localStorage.setItem('usuario', JSON.stringify(localUser));
      console.log('✅ Usuario guardado en localStorage');
      
      return localUser;

    } catch (error: any) {
      console.error('❌ Error en registro con email:', error);
      
      // Manejo específico de errores
      if (error.code === 'auth/operation-not-allowed') {
        throw new Error('⚠️ Firebase no configurado: Ve a Firebase Console → Authentication → Settings → Authorized domains y agrega "localhost"');
      } else if (error.message.includes('email-already-in-use') || 
          error.message.includes('ya existe') || 
          error.message.includes('already exists')) {
        throw new Error('Este correo electrónico ya está registrado');
      } else if (error.code === 'auth/email-already-in-use') {
        throw new Error('Este correo electrónico ya está registrado');
      } else if (error.code === 'auth/invalid-email') {
        throw new Error('Correo electrónico inválido');
      } else if (error.code === 'auth/weak-password') {
        throw new Error('La contraseña es muy débil');
      } else if (error.code === 'auth/unauthorized-domain') {
        throw new Error('⚠️ Dominio no autorizado: Agrega tu dominio en Firebase Console → Authentication → Authorized domains');
      }
      
      throw error;
    }
  },

  /**
   * Registrar usuario con Google
   * Autentica con Google, luego crea en el backend
   */
  registerWithGoogle: async (
    auth: ReturnType<typeof getAuth>,
    googleProvider: GoogleAuthProvider
  ): Promise<LocalUser> => {
    try {
      console.log('🔄 Iniciando registro con Google...');

      // PASO 1: Autenticar con Google en Firebase
      console.log('📤 Abriendo popup de Google...');
      const result = await signInWithPopup(auth, googleProvider);
      const firebaseUser = result.user;
      console.log('✅ Usuario autenticado con Google:', firebaseUser.uid);

      // PASO 2: Extraer información del perfil de Google
      const nombres = firebaseUser.displayName?.split(' ') || ['', ''];
      const primerNombre = nombres[0] || '';
      const primerApellido = nombres.slice(1).join(' ') || '';
      const email = firebaseUser.email || '';

      // PASO 3: Intentar crear usuario en el backend
      console.log('📤 Creando usuario en el backend...');
      let backendUser: BackendUser | null = null;
      
      const backendPayload: CreateUserPayload = {
        nombres: primerNombre,
        apellidos: primerApellido,
        email: email,
        contrasena: `google-auth-${firebaseUser.uid}`, // Contraseña temporal
        confirmar_nueva_contrasena: `google-auth-${firebaseUser.uid}`
      };

      try {
        backendUser = await usersService.createUser(backendPayload);
        console.log('✅ Usuario creado en backend:', backendUser.id);
      } catch (error: any) {
        // Si el usuario ya existe, está bien
        if (error.message.includes('ya existe') || 
            error.message.includes('already exists') ||
            error.message.includes('duplicate')) {
          console.log('ℹ️ Usuario ya existe en backend, continuando...');
          // Crear un objeto básico con el email
          backendUser = {
            id: firebaseUser.uid, // Usar Firebase UID como fallback
            primer_nombre: primerNombre,
            primer_apellido: primerApellido,
            email: email
          };
        } else {
          throw error; // Si es otro error, lanzarlo
        }
      }

      // PASO 4: Crear objeto de usuario local
      const localUser: LocalUser = {
        id: backendUser?.id || firebaseUser.uid,
        backendId: backendUser?.id,
        firebaseUid: firebaseUser.uid,
        username: email,
        nombre: primerNombre,
        apellido: primerApellido,
        email: email,
        loginMethod: 'google',
        picture: firebaseUser.photoURL || ''
      };

      // PASO 5: Guardar en localStorage
      localStorage.setItem('usuario', JSON.stringify(localUser));
      console.log('✅ Usuario guardado en localStorage');
      
      return localUser;

    } catch (error: any) {
      console.error('❌ Error en registro con Google:', error);
      
      // Manejo de errores específicos de Google
      if (error.code === 'auth/operation-not-allowed') {
        throw new Error('⚠️ Firebase no configurado: Ve a Firebase Console → Authentication → Sign-in method y habilita Google');
      } else if (error.code === 'auth/unauthorized-domain') {
        throw new Error('⚠️ Dominio no autorizado: Agrega tu dominio en Firebase Console → Authentication → Authorized domains');
      } else if (error.code === 'auth/popup-closed-by-user') {
        throw new Error('Autenticación cancelada');
      } else if (error.code === 'auth/popup-blocked') {
        throw new Error('Popup bloqueado. Permite popups para este sitio.');
      } else if (error.code === 'auth/cancelled-popup-request') {
        throw new Error('Popup cerrado');
      }
      
      throw error;
    }
  },

  /**
   * Obtener usuario actual desde localStorage
   */
  getCurrentUser: (): LocalUser | null => {
    const userStr = localStorage.getItem('usuario');
    if (!userStr) return null;
    
    try {
      return JSON.parse(userStr) as LocalUser;
    } catch {
      return null;
    }
  },

  /**
   * Login con email y contraseña
   * Autentica con el backend y Firebase
   */
  loginWithEmail: async (
    auth: ReturnType<typeof getAuth>,
    email: string,
    password: string
  ): Promise<LocalUser> => {
    try {
      console.log('🔄 Iniciando login con email...');

      // PASO 1: Autenticar con el backend
      console.log('📤 Autenticando en el backend...');
      const backendUser = await usersService.loginUser(email, password);
      console.log('✅ Autenticado en backend:', backendUser.id);

      // PASO 2: Autenticar con Firebase
      console.log('📤 Autenticando en Firebase...');
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const firebaseUser = userCredential.user;
        console.log('✅ Autenticado en Firebase:', firebaseUser.uid);

        // PASO 3: Crear objeto de usuario local
        const localUser: LocalUser = {
          id: backendUser.id,
          backendId: backendUser.id,
          firebaseUid: firebaseUser.uid,
          username: email,
          nombre: backendUser.primer_nombre,
          apellido: backendUser.primer_apellido,
          email: email,
          loginMethod: 'email',
          picture: firebaseUser.photoURL || ''
        };

        // PASO 4: Guardar en localStorage
        localStorage.setItem('usuario', JSON.stringify(localUser));
        console.log('✅ Usuario guardado en localStorage');
        
        return localUser;

      } catch (firebaseError: any) {
        // Si falla Firebase pero el backend autenticó correctamente
        console.warn('⚠️ Firebase falló pero backend OK, continuando...');
        
        const localUser: LocalUser = {
          id: backendUser.id,
          backendId: backendUser.id,
          username: email,
          nombre: backendUser.primer_nombre,
          apellido: backendUser.primer_apellido,
          email: email,
          loginMethod: 'email',
          picture: ''
        };

        localStorage.setItem('usuario', JSON.stringify(localUser));
        console.log('✅ Usuario guardado en localStorage (sin Firebase)');
        
        return localUser;
      }

    } catch (error: any) {
      console.error('❌ Error en login:', error);
      
      // Manejo de errores específicos
      if (error.message.includes('credenciales') || 
          error.message.includes('incorrecta') ||
          error.message.includes('invalid')) {
        throw new Error('Email o contraseña incorrectos');
      } else if (error.message.includes('no encontrado') ||
                 error.message.includes('not found')) {
        throw new Error('Usuario no encontrado');
      } else if (error.code === 'auth/user-not-found') {
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
   * Login con Google
   * Similar al registro, verifica si existe en backend
   */
  loginWithGoogle: async (
    auth: ReturnType<typeof getAuth>,
    googleProvider: GoogleAuthProvider
  ): Promise<LocalUser> => {
    try {
      console.log('🔄 Iniciando login con Google...');

      // PASO 1: Autenticar con Google en Firebase
      console.log('📤 Abriendo popup de Google...');
      const result = await signInWithPopup(auth, googleProvider);
      const firebaseUser = result.user;
      console.log('✅ Usuario autenticado con Google:', firebaseUser.uid);

      // PASO 2: Extraer información del perfil
      const nombres = firebaseUser.displayName?.split(' ') || ['', ''];
      const primerNombre = nombres[0] || '';
      const primerApellido = nombres.slice(1).join(' ') || '';
      const email = firebaseUser.email || '';

      // PASO 3: Verificar si existe en el backend
      // Usamos un email y una contraseña temporal para "autenticar"
      // En realidad solo queremos verificar que el usuario existe
      console.log('📤 Verificando usuario en el backend...');
      
      let backendUser: BackendUser;
      try {
        // Intentar login con contraseña de Google
        backendUser = await usersService.loginUser(email, `google-auth-${firebaseUser.uid}`);
        console.log('✅ Usuario encontrado en backend:', backendUser.id);
      } catch (error: any) {
        // Si falla el login, el usuario no está registrado
        throw new Error('Usuario no registrado. Por favor regístrate primero.');
      }

      // PASO 4: Crear objeto de usuario local
      const localUser: LocalUser = {
        id: backendUser.id,
        backendId: backendUser.id,
        firebaseUid: firebaseUser.uid,
        username: email,
        nombre: primerNombre,
        apellido: primerApellido,
        email: email,
        loginMethod: 'google',
        picture: firebaseUser.photoURL || ''
      };

      // PASO 5: Guardar en localStorage
      localStorage.setItem('usuario', JSON.stringify(localUser));
      console.log('✅ Usuario guardado en localStorage');
      
      return localUser;

    } catch (error: any) {
      console.error('❌ Error en login con Google:', error);
      
      // Manejo de errores específicos
      if (error.code === 'auth/popup-closed-by-user') {
        throw new Error('Autenticación cancelada');
      } else if (error.code === 'auth/popup-blocked') {
        throw new Error('Popup bloqueado. Permite popups para este sitio.');
      } else if (error.code === 'auth/cancelled-popup-request') {
        throw new Error('Popup cerrado');
      }
      
      throw error;
    }
  },

  /**
   * Logout
   * Cierra sesión en Firebase y limpia localStorage
   */
  logout: async (auth: ReturnType<typeof getAuth>): Promise<void> => {
    try {
      await auth.signOut();
      localStorage.removeItem('usuario');
      console.log('✅ Sesión cerrada');
    } catch (error) {
      console.error('❌ Error al cerrar sesión:', error);
      // Limpiar localStorage de todas formas
      localStorage.removeItem('usuario');
    }
  }
};