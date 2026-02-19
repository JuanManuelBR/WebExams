import { Request, Response } from "express";
import axios from "axios";
import { pdfService } from "../services/PDFService";

export class PDFController {
  static async get(req: Request, res: Response) {
    try {
      const { fileName } = req.params;
      const url = pdfService.getPDFUrl(fileName);
      return res.redirect(url);
    } catch (error: any) {
      return res.status(404).json({ message: "PDF no encontrado" });
    }
  }

  static async proxy(req: Request, res: Response) {
    try {
      const { url } = req.query;
      if (!url || typeof url !== "string") {
        return res.status(400).json({ message: "URL requerida" });
      }
      if (!url.startsWith("https://res.cloudinary.com/")) {
        return res.status(403).json({ message: "URL no permitida" });
      }
      const response = await axios.get<any>(url, { responseType: "stream" });
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", 'inline; filename="exam.pdf"');
      res.setHeader("Cache-Control", "private, max-age=3600");
      response.data.pipe(res);
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