import { Router } from "express";
import { ExamController } from "@src/controllers/ExamController";

const router = Router();

/**
 * @openapi
 * /api/exam/attempt/start:
 *   post:
 *     tags:
 *       - Attempts
 *     summary: Iniciar un nuevo intento de examen
 *     description: Permite a un estudiante iniciar un nuevo intento de examen proporcionando el código del examen y sus datos personales (si son requeridos).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/StartExamAttemptDto'
 *     responses:
 *       201:
 *         description: Intento iniciado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 attempt:
 *                   $ref: '#/components/schemas/ExamAttempt'
 *                 examInProgress:
 *                   type: object
 *                   properties:
 *                     codigo_acceso:
 *                       type: string
 *                       example: 'XYZ789'
 *                     id_sesion:
 *                       type: string
 *                       example: 'session-uuid-123'
 *                     fecha_expiracion:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *                 exam:
 *                   type: object
 *                   description: Información del examen
 *       400:
 *         description: Datos inválidos o examen no disponible
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Examen no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/attempt/start", ExamController.startAttempt);

/**
 * @openapi
 * /api/exam/attempt/resume:
 *   post:
 *     tags:
 *       - Attempts
 *     summary: Reanudar un intento de examen existente
 *     description: Permite a un estudiante reanudar un intento de examen usando su código de acceso y sesión.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ResumeExamAttemptDto'
 *     responses:
 *       200:
 *         description: Intento reanudado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 attempt:
 *                   $ref: '#/components/schemas/ExamAttempt'
 *                 examInProgress:
 *                   type: object
 *                 exam:
 *                   type: object
 *       403:
 *         description: Intento bloqueado o expirado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Intento no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/attempt/resume", ExamController.resumeAttempt);

/**
 * @openapi
 * /api/exam/answer:
 *   post:
 *     tags:
 *       - Answers
 *     summary: Guardar o actualizar una respuesta
 *     description: Permite al estudiante guardar o actualizar su respuesta a una pregunta del examen.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateExamAnswerDto'
 *     responses:
 *       201:
 *         description: Respuesta guardada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ExamAnswer'
 *       400:
 *         description: Datos inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: No se pueden guardar respuestas en este intento (bloqueado o finalizado)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Intento no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/answer", ExamController.saveAnswer);

/**
 * @openapi
 * /api/exam/event:
 *   post:
 *     tags:
 *       - Events
 *     summary: Registrar un evento de seguridad
 *     description: Registra eventos de seguridad como cambio de pestaña, salida de pantalla completa, etc.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateExamEventDto'
 *     responses:
 *       201:
 *         description: Evento registrado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: number
 *                 tipo_evento:
 *                   type: string
 *                 fecha_envio:
 *                   type: string
 *                   format: date-time
 *                 intento_id:
 *                   type: number
 *                 leido:
 *                   type: boolean
 *       404:
 *         description: Intento no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/event", ExamController.createEvent);

/**
 * @openapi
 * /api/exam/attempt/{intento_id}/finish:
 *   post:
 *     tags:
 *       - Attempts
 *     summary: Finalizar un intento de examen
 *     description: Finaliza el intento de examen, calcula el puntaje total y actualiza el estado a 'finished'.
 *     parameters:
 *       - in: path
 *         name: intento_id
 *         required: true
 *         schema:
 *           type: number
 *         description: ID del intento
 *     responses:
 *       200:
 *         description: Intento finalizado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ExamAttempt'
 *       400:
 *         description: El examen ya fue finalizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: No puedes finalizar un examen bloqueado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Intento no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/attempt/:intento_id/finish", ExamController.finishAttempt);

/**
 * @openapi
 * /api/exam/attempt/{intento_id}/unlock:
 *   post:
 *     tags:
 *       - Attempts
 *     summary: Desbloquear un intento bloqueado (solo profesor)
 *     description: Permite al profesor desbloquear un intento que fue bloqueado por actividad sospechosa.
 *     parameters:
 *       - in: path
 *         name: intento_id
 *         required: true
 *         schema:
 *           type: number
 *         description: ID del intento
 *     responses:
 *       200:
 *         description: Intento desbloqueado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 codigo_acceso:
 *                   type: string
 *                 estado:
 *                   type: string
 *                   enum: [active]
 *       400:
 *         description: El intento no está bloqueado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Intento no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/attempt/:intento_id/unlock", ExamController.unlockAttempt);

/**
 * @openapi
 * /api/exam/attempt/{intento_id}/abandon:
 *   post:
 *     tags:
 *       - Attempts
 *     summary: Abandonar un intento de examen
 *     description: Marca el intento como abandonado cuando el estudiante cierra el examen sin finalizarlo.
 *     parameters:
 *       - in: path
 *         name: intento_id
 *         required: true
 *         schema:
 *           type: number
 *         description: ID del intento
 *     responses:
 *       200:
 *         description: Intento marcado como abandonado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ExamAttempt'
 *       404:
 *         description: Intento no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/attempt/:intento_id/abandon", ExamController.abandonAttempt);

/**
 * @openapi
 * /api/exam/{examId}/active-attempts:
 *   get:
 *     tags:
 *       - Attempts
 *     summary: Obtener todos los intentos de un examen
 *     description: Obtiene la lista de todos los intentos (activos, finalizados, bloqueados) de un examen específico.
 *     parameters:
 *       - in: path
 *         name: examId
 *         required: true
 *         schema:
 *           type: number
 *         description: ID del examen
 *     responses:
 *       200:
 *         description: Lista de intentos obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: number
 *                   nombre_estudiante:
 *                     type: string
 *                   correo_estudiante:
 *                     type: string
 *                   identificacion_estudiante:
 *                     type: string
 *                   estado:
 *                     type: string
 *                     enum: [active, finished, blocked, abandonado]
 *                   fecha_inicio:
 *                     type: string
 *                     format: date-time
 *                   tiempoTranscurrido:
 *                     type: string
 *                   progreso:
 *                     type: number
 *                   alertas:
 *                     type: number
 *                   alertasNoLeidas:
 *                     type: number
 *                   codigo_acceso:
 *                     type: string
 *                   fecha_expiracion:
 *                     type: string
 *                     format: date-time
 *                     nullable: true
 *       400:
 *         description: ID de examen inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/:examId/active-attempts", ExamController.getActiveAttemptsByExam);

/**
 * @openapi
 * /api/exam/attempt/{attemptId}/events:
 *   get:
 *     tags:
 *       - Events
 *     summary: Obtener eventos de un intento
 *     description: Obtiene todos los eventos de seguridad registrados para un intento específico.
 *     parameters:
 *       - in: path
 *         name: attemptId
 *         required: true
 *         schema:
 *           type: number
 *         description: ID del intento
 *     responses:
 *       200:
 *         description: Lista de eventos obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: number
 *                   tipo_evento:
 *                     type: string
 *                   fecha_envio:
 *                     type: string
 *                     format: date-time
 *                   leido:
 *                     type: boolean
 *       400:
 *         description: ID de intento inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/attempt/:attemptId/events", ExamController.getAttemptEvents);

/**
 * @openapi
 * /api/exam/attempt/{attemptId}/events/read:
 *   patch:
 *     tags:
 *       - Events
 *     summary: Marcar eventos como leídos
 *     description: Marca todos los eventos no leídos de un intento como leídos.
 *     parameters:
 *       - in: path
 *         name: attemptId
 *         required: true
 *         schema:
 *           type: number
 *         description: ID del intento
 *     responses:
 *       200:
 *         description: Eventos marcados como leídos exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 'Alertas marcadas como leídas'
 *       400:
 *         description: ID de intento inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.patch("/attempt/:attemptId/events/read", ExamController.markEventsAsRead);

/**
 * @openapi
 * /api/exam/attempt/{intento_id}/details:
 *   get:
 *     tags:
 *       - Attempts
 *     summary: Obtener detalles completos de un intento (para el profesor)
 *     description: Obtiene información detallada del intento incluyendo todas las respuestas, puntajes, retroalimentación, eventos y estadísticas.
 *     parameters:
 *       - in: path
 *         name: intento_id
 *         required: true
 *         schema:
 *           type: number
 *         description: ID del intento
 *     responses:
 *       200:
 *         description: Detalles del intento obtenidos exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AttemptDetails'
 *       400:
 *         description: ID de intento inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Intento no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/attempt/:intento_id/details', ExamController.getAttemptDetails);

/**
 * @openapi
 * /api/exam/answer/{respuesta_id}/manual-grade:
 *   patch:
 *     tags:
 *       - Grading
 *     summary: Actualizar calificación manual y retroalimentación
 *     description: Permite al profesor actualizar manualmente el puntaje y/o agregar retroalimentación a una respuesta. El puntaje debe estar entre 0 y el máximo de la pregunta. Recalcula automáticamente el puntaje total del intento.
 *     parameters:
 *       - in: path
 *         name: respuesta_id
 *         required: true
 *         schema:
 *           type: number
 *         description: ID de la respuesta
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateManualGradeDto'
 *     responses:
 *       200:
 *         description: Calificación actualizada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ExamAnswer'
 *       400:
 *         description: Puntaje inválido (negativo o mayor al máximo permitido)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               puntaje_negativo:
 *                 value:
 *                   message: 'El puntaje no puede ser negativo'
 *               puntaje_excedido:
 *                 value:
 *                   message: 'El puntaje no puede exceder el máximo de la pregunta (5 puntos)'
 *       404:
 *         description: Respuesta no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.patch('/answer/:respuesta_id/manual-grade', ExamController.updateManualGrade);

/**
 * @openapi
 * /api/exam/{examId}/force-finish:
 *   post:
 *     tags:
 *       - Attempts
 *     summary: Forzar envío de todos los intentos activos (solo profesor)
 *     description: |
 *       Finaliza automáticamente todos los intentos activos de un examen.
 *       Califica cada intento con las respuestas que tenga hasta el momento y actualiza el estado a 'finished' en ambas tablas (exams_attempts y exams_in_progress).
 *       Notifica a cada estudiante que su examen fue forzado a terminar.
 *     parameters:
 *       - in: path
 *         name: examId
 *         required: true
 *         schema:
 *           type: number
 *         description: ID del examen
 *     responses:
 *       200:
 *         description: Intentos finalizados exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: '5 intentos activos han sido finalizados exitosamente'
 *                 finalizados:
 *                   type: number
 *                   example: 5
 *                 detalles:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       intentoId:
 *                         type: number
 *                         example: 48
 *                       estudiante:
 *                         type: object
 *                         properties:
 *                           nombre:
 *                             type: string
 *                             example: 'Juan Pérez'
 *                           correo:
 *                             type: string
 *                             example: 'juan@example.com'
 *                           identificacion:
 *                             type: string
 *                             example: '123456'
 *                       puntaje:
 *                         type: number
 *                         example: 7.5
 *                       puntajeMaximo:
 *                         type: number
 *                         example: 10
 *                       porcentaje:
 *                         type: number
 *                         example: 75
 *                       notaFinal:
 *                         type: number
 *                         example: 3.75
 *                       respuestasGuardadas:
 *                         type: number
 *                         description: Número de respuestas que el estudiante había guardado
 *                         example: 8
 *       400:
 *         description: ID de examen inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/:examId/force-finish', ExamController.forceFinishActiveAttempts);

export default router;
