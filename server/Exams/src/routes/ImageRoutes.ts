// src/routes/image.routes.ts
import { Router } from "express";
import { ImageController } from "../controllers/ImageController";

import { upload } from "../middlewares/upload";

const router = Router();

/**
 * @openapi
 * /api/images/upload:
 *   post:
 *     tags:
 *       - Images
 *     summary: Subir una imagen
 *     description: "Sube una imagen al almacenamiento local del servidor. Formatos aceptados: JPEG, PNG, GIF, WEBP, BMP. Tamaño máximo 10 MB."
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - image
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: "Archivo de imagen (JPEG, PNG, GIF, WEBP, BMP — NO SVG)"
 *     responses:
 *       200:
 *         description: Imagen subida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 fileName:
 *                   type: string
 *                   example: imagen_pregunta_1.webp
 *                 url:
 *                   type: string
 *                   example: abc123.webp
 *       400:
 *         description: Tipo de archivo no permitido o archivo inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/upload", upload.single("image"), ImageController.upload);

/**
 * @openapi
 * /api/images/{fileName}:
 *   get:
 *     tags:
 *       - Images
 *     summary: Obtener una imagen por nombre
 *     parameters:
 *       - in: path
 *         name: fileName
 *         required: true
 *         schema:
 *           type: string
 *         example: imagen_pregunta_1.webp
 *     responses:
 *       200:
 *         description: Imagen retornada (stream del archivo local)
 *       404:
 *         description: Imagen no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/:fileName", ImageController.get);

/**
 * @openapi
 * /api/images/{fileName}:
 *   delete:
 *     tags:
 *       - Images
 *     summary: Eliminar una imagen
 *     parameters:
 *       - in: path
 *         name: fileName
 *         required: true
 *         schema:
 *           type: string
 *         example: imagen_pregunta_1.webp
 *     responses:
 *       200:
 *         description: Imagen eliminada exitosamente
 *       404:
 *         description: Imagen no encontrada
 */
router.delete("/:fileName", ImageController.delete);

export default router;
