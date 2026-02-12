import * as admin from "firebase-admin";
import { FIREBASE_PROJECT_ID } from "config/config";

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: FIREBASE_PROJECT_ID,
  });
}

export const firebaseAdmin = admin;
