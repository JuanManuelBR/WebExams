// ============================================
// 📁 BACKEND/src/routes/UserRoutes.ts
// ============================================

import { authorizeOwnUser } from "@src/middlewares/authorization";
import { UserController } from "../controllers/UserController";
import { authenticateToken } from "../middlewares/auth";
import { Router } from "express";

const router = Router();

// ============================================
// RUTAS PÚBLICAS (Sin autenticación)
// ============================================

/**
 * @openapi
 * /api/users/login:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Iniciar sesión con correo y contraseña
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginDto'
 *     responses:
 *       200:
 *         description: Sesión iniciada. Retorna el usuario y establece cookie HttpOnly con JWT.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Credenciales incorrectas
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/login", UserController.login);

/**
 * @openapi
 * /api/users/login-google:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Iniciar sesión con Google OAuth
 *     description: Verifica el idToken de Google, crea o recupera el usuario, y establece sesión.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginGoogleDto'
 *     responses:
 *       200:
 *         description: Sesión iniciada con Google. Establece cookie HttpOnly con JWT.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Token de Google inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/login-google", UserController.loginWithGoogle);

/**
 * @openapi
 * /api/users/logout:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Cerrar sesión
 *     description: Invalida la cookie JWT del usuario.
 *     responses:
 *       200:
 *         description: Sesión cerrada exitosamente
 */
router.post("/logout", UserController.logout);

/**
 * @openapi
 * /api/users/heartbeat:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Heartbeat de sesión
 *     description: Mantiene la sesión activa. Usado con sendBeacon al cerrar el navegador. No requiere autenticación.
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: number
 *                 example: 1
 *     responses:
 *       200:
 *         description: Heartbeat registrado
 */
router.post("/heartbeat", UserController.heartbeat);

/**
 * @openapi
 * /api/users:
 *   post:
 *     tags:
 *       - Users
 *     summary: Registrar un nuevo usuario
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterDto'
 *     responses:
 *       201:
 *         description: Usuario registrado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Datos inválidos o correo ya registrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/", UserController.AddUser);

/**
 * @openapi
 * /api/users/email/{email}:
 *   get:
 *     tags:
 *       - Users
 *     summary: Obtener usuario por correo electrónico
 *     description: Busca un usuario por su correo. Usado principalmente para integración con Firebase.
 *     parameters:
 *       - in: path
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *           format: email
 *         example: juan@example.com
 *     responses:
 *       200:
 *         description: Usuario encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       404:
 *         description: Usuario no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/email/:email", UserController.getUserByEmail);

/**
 * @openapi
 * /api/users/firebase/{firebaseUid}:
 *   get:
 *     tags:
 *       - Users
 *     summary: Obtener usuario por UID de Firebase
 *     parameters:
 *       - in: path
 *         name: firebaseUid
 *         required: true
 *         schema:
 *           type: string
 *         example: firebase-uid-abc123
 *     responses:
 *       200:
 *         description: Usuario encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       404:
 *         description: Usuario no encontrado
 */
router.get("/firebase/:firebaseUid", UserController.getUserByFirebaseUid);

/**
 * @openapi
 * /api/users/find-or-create:
 *   post:
 *     tags:
 *       - Users
 *     summary: Buscar o crear usuario (Google OAuth)
 *     description: Si el usuario existe lo retorna, si no lo crea. Usado en el flujo de Google OAuth.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - correoElectronico
 *             properties:
 *               correoElectronico:
 *                 type: string
 *                 format: email
 *                 example: juan@example.com
 *               nombre:
 *                 type: string
 *                 example: Juan Pérez
 *               firebaseUid:
 *                 type: string
 *                 example: firebase-uid-abc123
 *     responses:
 *       200:
 *         description: Usuario existente retornado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       201:
 *         description: Usuario nuevo creado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 */
router.post("/find-or-create", UserController.findOrCreateUser);

/**
 * @openapi
 * /api/users/{id}/update-access:
 *   patch:
 *     tags:
 *       - Users
 *     summary: Actualizar último acceso del usuario
 *     description: Registra la fecha del último acceso. Usado con usuarios de Google OAuth.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: number
 *         example: 1
 *     responses:
 *       200:
 *         description: Último acceso actualizado
 *       404:
 *         description: Usuario no encontrado
 */
router.patch("/:id/update-access", UserController.updateLastAccess);

// ============================================
// RUTAS PROTEGIDAS (Con autenticación)
// ============================================

/**
 * @openapi
 * /api/users/active:
 *   get:
 *     tags:
 *       - Users
 *     summary: Listar usuarios activos
 *     description: Retorna los usuarios que han tenido actividad reciente.
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Lista de usuarios activos
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 *       401:
 *         description: No autenticado
 */
router.get("/active", authenticateToken, UserController.getActiveUsers);

/**
 * @openapi
 * /api/users/{id}:
 *   get:
 *     tags:
 *       - Users
 *     summary: Obtener usuario por ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: number
 *         example: 1
 *     responses:
 *       200:
 *         description: Datos del usuario
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       404:
 *         description: Usuario no encontrado
 */
router.get("/:id", UserController.getUserById);

/**
 * @openapi
 * /api/users/{id}:
 *   delete:
 *     tags:
 *       - Users
 *     summary: Eliminar usuario
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: number
 *         example: 1
 *     responses:
 *       200:
 *         description: Usuario eliminado
 *       404:
 *         description: Usuario no encontrado
 */
router.delete("/:id", authenticateToken, authorizeOwnUser, UserController.deleteUser);

/**
 * @openapi
 * /api/users/{id}:
 *   put:
 *     tags:
 *       - Users
 *     summary: Editar perfil de usuario
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: number
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre:
 *                 type: string
 *                 example: Juan Pérez
 *               correoElectronico:
 *                 type: string
 *                 format: email
 *                 example: juan@example.com
 *               contrasena:
 *                 type: string
 *                 description: Nueva contraseña (opcional)
 *                 example: newpassword123
 *     responses:
 *       200:
 *         description: Usuario actualizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       404:
 *         description: Usuario no encontrado
 */
router.put("/:id", authenticateToken, authorizeOwnUser, UserController.editUser );

export default router;
