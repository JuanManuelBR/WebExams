import { Request, Response } from "express";
import { pdfService } from "../services/PDFService";

export class PDFController {
  static async get(req: Request, res: Response) {
    try {
      const { fileName } = req.params;
      const filePath = await pdfService.resolvePDFPath(fileName);
      if (!filePath) {
        return res.status(404).json({ message: "PDF no encontrado" });
      }
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", 'inline; filename="exam.pdf"');
      res.setHeader("Cache-Control", "private, max-age=3600");
      return res.sendFile(filePath);
    } catch (error: any) {
      return res.status(404).json({ message: "PDF no encontrado" });
    }
  }

  /**
   * Compatibilidad con la ruta antigua /api/pdfs/proxy?url=...
   * Solo se conserva para registros heredados con URL absoluta.
   * Para archivos nuevos (locales), el frontend usa GET /:fileName directo.
   */
  static async proxy(req: Request, res: Response) {
    try {
      const { url } = req.query;
      if (!url || typeof url !== "string") {
        return res.status(400).json({ message: "URL requerida" });
      }
      // Si recibimos un filename plano, redirigir al endpoint estándar
      if (!url.startsWith("http")) {
        return res.redirect(`/api/pdfs/${encodeURIComponent(url)}`);
      }
      // Para URLs externas heredadas, ya no proxeamos: rechazamos.
      return res.status(410).json({
        message: "Las URLs externas ya no son soportadas; los PDFs ahora se sirven localmente.",
      });
    } catch (error: any) {
      return res.status(500).json({ message: "Error al obtener el PDF" });
    }
  }

  static async delete(req: Request, res: Response) {
    try {
      const { fileName } = req.params;
      await pdfService.deletePDF(fileName);
      return res.status(200).json({ message: "PDF eliminado exitosamente" });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  }

  static async getInfo(req: Request, res: Response) {
    try {
      const { fileName } = req.params;
      const info = await pdfService.getPDFInfo(fileName);

      if (!info) {
        return res.status(404).json({ message: "PDF no encontrado" });
      }

      return res.status(200).json(info);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  }
}
