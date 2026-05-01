import * as admin from "firebase-admin";

// Inicialización segura — si las credenciales son inválidas o faltan,
// el servicio sigue arrancando pero las funciones de Firebase quedan deshabilitadas.
let firebaseInitialized = false;

if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (projectId && clientEmail && privateKey) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      firebaseInitialized = true;
      console.log("✅ Firebase Admin SDK inicializado");
    } catch (err: any) {
      console.warn(
        "⚠️ Firebase Admin SDK NO se pudo inicializar — las funciones de Firebase estarán deshabilitadas.",
      );
      console.warn(`   Causa: ${err?.message || err}`);
    }
  } else {
    console.warn(
      "⚠️ Variables de Firebase Admin no configuradas — login con Google deshabilitado.",
    );
  }
}

export const firebaseAdmin = admin;
export const isFirebaseAvailable = () => firebaseInitialized;
