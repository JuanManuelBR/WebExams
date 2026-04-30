// src/routes/PDFRoutes.ts
import { Router } from "express";
import { PDFController } from "../controllers/PDFController";

const router = Router();

/**
 * @openapi
 * /api/pdfs/proxy:
 *   get:
 *     tags:
 *       - PDFs
 *     summary: Proxy para archivos PDF externos
 *     description: Sirve como proxy para acceder a PDFs evitando restricciones CORS. Se usa internamente por el visor de PDF.
 *     parameters:
 *       - in: query
 *         name: url
 *         required: true
 *         schema:
 *           type: string
 *         description: URL del PDF a proxiar
 *         example: https://storage.example.com/examen.pdf
 *     responses:
 *       200:
 *         description: PDF retornado como stream
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: URL inválida o no proporcionada
 */
router.get("/proxy", PDFController.proxy);

/**
 * @openapi
 * /api/pdfs/{fileName}:
 *   get:
 *     tags:
 *       - PDFs
 *     summary: Obtener un PDF por nombre de archivo
 *     parameters:
 *       - in: path
 *         name: fileName
 *         required: true
 *         schema:
 *           type: string
 *         example: examen_prog.pdf
 *     responses:
 *       200:
 *         description: PDF retornado como stream
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Archivo PDF no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/:fileName", PDFController.get);

/**
 * @openapi
 * /api/pdfs/{fileName}/info:
 *   get:
 *     tags:
 *       - PDFs
 *     summary: Obtener metadatos de un PDF
 *     description: Retorna información del PDF como número de páginas, tamaño y URL de acceso.
 *     parameters:
 *       - in: path
 *         name: fileName
 *         required: true
 *         schema:
 *           type: string
 *         example: examen_prog.pdf
 *     responses:
 *       200:
 *         description: Metadatos del PDF
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 fileName:
 *                   type: string
 *                   example: examen_prog.pdf
 *                 url:
 *                   type: string
 *                   example: abc123.pdf
 *                 pages:
 *                   type: number
 *                   nullable: true
 *                   example: 5
 *                 size:
 *                   type: number
 *                   description: Tamaño en bytes
 *                   example: 102400
 *       404:
 *         description: PDF no encontrado
 */
router.get("/:fileName/info", PDFController.getInfo);

/**
 * @openapi
 * /api/pdfs/{fileName}:
 *   delete:
 *     tags:
 *       - PDFs
 *     summary: Eliminar un PDF
 *     parameters:
 *       - in: path
 *         name: fileName
 *         required: true
 *         schema:
 *           type: string
 *         example: examen_prog.pdf
 *     responses:
 *       200:
 *         description: PDF eliminado exitosamente
 *       404:
 *         description: PDF no encontrado
 */
router.delete("/:fileName", PDFController.delete);

export default router;
