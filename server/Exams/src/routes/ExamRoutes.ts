import { ExamsController } from "../controllers/ExamController";
import { Router } from "express";

import { authenticateToken } from "../middlewares/auth";
import { upload } from "../middlewares/upload";
import { authorizeExamOwner } from "../middlewares/authorization";

const router = Router();

/**
 * @openapi
 * /api/exams/me:
 *   get:
 *     tags:
 *       - Exams
 *     summary: Obtener exámenes del usuario autenticado
 *     description: Retorna todos los exámenes creados por el profesor autenticado.
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Lista de exámenes del usuario
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Exam'
 *       401:
 *         description: No autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/me", authenticateToken, ExamsController.getExamsByUser, authorizeExamOwner);

/**
 * @openapi
 * /api/exams:
 *   post:
 *     tags:
 *       - Exams
 *     summary: Crear un nuevo examen
 *     description: Crea un nuevo examen. Acepta multipart/form-data para adjuntar PDF e imágenes de preguntas.
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - nombre
 *               - questions
 *             properties:
 *               nombre:
 *                 type: string
 *                 example: Examen de Programación
 *               descripcion:
 *                 type: string
 *                 example: <p>Descripción del examen</p>
 *               nombreProfesor:
 *                 type: string
 *                 example: Dr. García
 *               limiteTiempo:
 *                 type: number
 *                 example: 90
 *               consecuencia:
 *                 type: string
 *                 enum: [bloquear, registrar, ninguna]
 *                 example: bloquear
 *               contrasena:
 *                 type: string
 *                 example: pass123
 *               questions:
 *                 type: string
 *                 description: JSON string con el array de preguntas
 *               pdfFile:
 *                 type: string
 *                 format: binary
 *                 description: Archivo PDF del examen (opcional)
 *               incluirCalculadoraCientifica:
 *                 type: boolean
 *               incluirHerramientaDibujo:
 *                 type: boolean
 *               incluirHojaExcel:
 *                 type: boolean
 *               incluirJavascript:
 *                 type: boolean
 *               incluirPython:
 *                 type: boolean
 *               incluirJava:
 *                 type: boolean
 *               dividirPreguntas:
 *                 type: boolean
 *               permitirVolverPreguntas:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Examen creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Exam'
 *       400:
 *         description: Datos inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: No autenticado
 */
router.post("/", upload.any(), ExamsController.addExam, authenticateToken);

/**
 * @openapi
 * /api/exams/{id}:
 *   put:
 *     tags:
 *       - Exams
 *     summary: Actualizar un examen existente
 *     description: Actualiza los datos de un examen incluyendo preguntas, PDF e imágenes.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: number
 *         example: 19
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               nombre:
 *                 type: string
 *               descripcion:
 *                 type: string
 *               limiteTiempo:
 *                 type: number
 *               questions:
 *                 type: string
 *                 description: JSON string con el array de preguntas
 *               pdfFile:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Examen actualizado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Exam'
 *       404:
 *         description: Examen no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put("/:id", authenticateToken, upload.any(), ExamsController.updateExam);

/**
 * @openapi
 * /api/exams:
 *   get:
 *     tags:
 *       - Exams
 *     summary: Listar todos los exámenes
 *     description: Retorna todos los exámenes existentes (requiere autenticación).
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Lista de todos los exámenes
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Exam'
 */
router.get("/", ExamsController.listExams, authenticateToken);

/**
 * @openapi
 * /api/exams/{id}:
 *   delete:
 *     tags:
 *       - Exams
 *     summary: Eliminar exámenes del usuario
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: number
 *         example: 19
 *     responses:
 *       200:
 *         description: Exámenes eliminados exitosamente
 *       401:
 *         description: No autenticado
 */
router.delete("/:id", ExamsController.deleteExamsByUser, authenticateToken);

/**
 * @openapi
 * /api/exams/by-id/{id}:
 *   get:
 *     tags:
 *       - Exams
 *     summary: Obtener examen por ID
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: number
 *         example: 19
 *     responses:
 *       200:
 *         description: Datos del examen
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Exam'
 *       404:
 *         description: Examen no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/by-id/:id", ExamsController.getExamById, authenticateToken);

/**
 * @openapi
 * /api/exams/{codigoExamen}:
 *   get:
 *     tags:
 *       - Exams
 *     summary: Obtener examen por código (público)
 *     description: Endpoint público para que los estudiantes obtengan la info básica del examen usando el código.
 *     parameters:
 *       - in: path
 *         name: codigoExamen
 *         required: true
 *         schema:
 *           type: string
 *         example: ABC123XY
 *     responses:
 *       200:
 *         description: Datos del examen
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Exam'
 *       404:
 *         description: Examen no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/:codigoExamen", ExamsController.getExamByCodigo);

/**
 * @openapi
 * /api/exams/forAttempt/{codigo}:
 *   get:
 *     tags:
 *       - Exams
 *     summary: Obtener examen para intento (público)
 *     description: Retorna los datos del examen necesarios para que el estudiante pueda presentarlo. Incluye preguntas.
 *     parameters:
 *       - in: path
 *         name: codigo
 *         required: true
 *         schema:
 *           type: string
 *         example: ABC123XY
 *     responses:
 *       200:
 *         description: Datos completos del examen con preguntas
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Exam'
 *       404:
 *         description: Examen no encontrado
 */
router.get("/forAttempt/:codigo", ExamsController.getExamForAttempt);

/**
 * @openapi
 * /api/exams/validate-password:
 *   post:
 *     tags:
 *       - Exams
 *     summary: Validar contraseña de un examen
 *     description: Verifica si la contraseña proporcionada por el estudiante es correcta para el examen.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - codigoExamen
 *               - contrasena
 *             properties:
 *               codigoExamen:
 *                 type: string
 *                 example: ABC123XY
 *               contrasena:
 *                 type: string
 *                 example: pass123
 *     responses:
 *       200:
 *         description: Contraseña válida
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 valid:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: Contraseña incorrecta
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/validate-password", ExamsController.validatePassword);

/**
 * @openapi
 * /api/exams/{id}/status:
 *   patch:
 *     tags:
 *       - Exams
 *     summary: Actualizar estado del examen
 *     description: Cambia el estado del examen (draft, open, closed, archived).
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: number
 *         example: 19
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - estado
 *             properties:
 *               estado:
 *                 type: string
 *                 enum: [draft, open, closed, archived]
 *                 example: open
 *     responses:
 *       200:
 *         description: Estado actualizado
 *       404:
 *         description: Examen no encontrado
 */
router.patch("/:id/status", authenticateToken, ExamsController.updateExamStatus);

/**
 * @openapi
 * /api/exams/{id}/archive:
 *   patch:
 *     tags:
 *       - Exams
 *     summary: Archivar un examen
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: number
 *         example: 19
 *     responses:
 *       200:
 *         description: Examen archivado
 *       404:
 *         description: Examen no encontrado
 */
router.patch("/:id/archive", authenticateToken, ExamsController.archiveExam);

/**
 * @openapi
 * /api/exams/{id}/single:
 *   delete:
 *     tags:
 *       - Exams
 *     summary: Eliminar un examen específico
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: number
 *         example: 19
 *     responses:
 *       200:
 *         description: Examen eliminado
 *       404:
 *         description: Examen no encontrado
 */
router.delete("/:id/single", authenticateToken, ExamsController.deleteExamById);

/**
 * @openapi
 * /api/exams/{id}/copy:
 *   post:
 *     tags:
 *       - Exams
 *     summary: Copiar/duplicar un examen
 *     description: Crea una copia exacta del examen con un nuevo código generado.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: number
 *         example: 19
 *     responses:
 *       201:
 *         description: Examen copiado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Exam'
 *       404:
 *         description: Examen no encontrado
 */
router.post("/:id/copy", authenticateToken, ExamsController.copyExam);

/**
 * @openapi
 * /api/exams/{id}/regenerate-code:
 *   patch:
 *     tags:
 *       - Exams
 *     summary: Regenerar código del examen
 *     description: Genera un nuevo código de acceso para el examen, invalidando el anterior.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: number
 *         example: 19
 *     responses:
 *       200:
 *         description: Nuevo código generado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 codigoExamen:
 *                   type: string
 *                   example: NEW456AB
 *       404:
 *         description: Examen no encontrado
 */
router.patch("/:id/regenerate-code", authenticateToken, ExamsController.regenerateExamCode);

/**
 * @openapi
 * /api/exams/{id}/remove-time-limit:
 *   patch:
 *     tags:
 *       - Exams
 *     summary: Eliminar el límite de tiempo de un examen activo
 *     description: Remueve el límite de tiempo para todos los intentos activos del examen (acción del profesor durante el examen).
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: number
 *         example: 19
 *     responses:
 *       200:
 *         description: Límite de tiempo eliminado
 *       404:
 *         description: Examen no encontrado
 */
router.patch("/:id/remove-time-limit", ExamsController.removeTimeLimit);

/**
 * @openapi
 * /api/exams/{id}/share:
 *   post:
 *     tags:
 *       - Exams
 *     summary: Compartir un examen con otro profesor
 *     description: |
 *       Crea una copia exacta del examen (con preguntas, imágenes y PDFs duplicados)
 *       y la asigna al profesor identificado por el correo electrónico de destino.
 *       El examen compartido queda en estado 'closed'. Si el correo no existe retorna 404.
 *       El profesor destino recibe una notificación en tiempo real vía WebSocket.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: number
 *         example: 19
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - correoDestino
 *             properties:
 *               correoDestino:
 *                 type: string
 *                 format: email
 *                 example: otro.profesor@universidad.edu.co
 *     responses:
 *       201:
 *         description: Examen compartido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Examen compartido correctamente
 *                 examen:
 *                   $ref: '#/components/schemas/Exam'
 *       400:
 *         description: Datos inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: No eres el propietario del examen
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Examen no encontrado o correo no existe
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               correo_no_existe:
 *                 value:
 *                   message: El correo no existe
 *               examen_no_encontrado:
 *                 value:
 *                   message: Examen no encontrado
 */
router.post("/:id/share", authenticateToken, ExamsController.shareExam);

export default router;
