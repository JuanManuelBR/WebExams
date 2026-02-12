// ============================================
// 📁 BACKEND/src/routes/UserRoutes.ts
// CÓDIGO COMPLETO CON RUTAS DE HEARTBEAT
// ============================================

import { UserController } from "@src/controllers/UserController";
import { authenticateToken } from "@src/middlewares/auth";
import { Router } from "express";

const router = Router();

// ============================================
// RUTAS PÚBLICAS (Sin autenticación)
// ============================================

// Autenticación
router.post("/login", UserController.login);
router.post("/login-google", UserController.loginWithGoogle);
router.post("/logout", UserController.logout);

// ✅ NUEVO: Heartbeat (sin autenticación para que funcione con sendBeacon)
router.post("/heartbeat", UserController.heartbeat);

// Registro
router.post("/", UserController.AddUser);

// Endpoints para Firebase
router.get("/email/:email", UserController.getUserByEmail);
router.get("/firebase/:firebaseUid", UserController.getUserByFirebaseUid);
router.post("/find-or-create", UserController.findOrCreateUser);

// Actualizar último acceso (para Google)
router.patch("/:id/update-access", UserController.updateLastAccess);

// ============================================
// RUTAS PROTEGIDAS (Con autenticación)
// ============================================

router.get("/", UserController.getUsers, authenticateToken);
router.get("/active", UserController.getActiveUsers, authenticateToken);
router.get("/:id", UserController.getUserById);
router.delete("/:id", UserController.deleteUser, authenticateToken);
router.put("/:id", UserController.editUser, authenticateToken);

export default router;
