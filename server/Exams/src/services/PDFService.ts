import { v4 as uuidv4 } from "uuid";
import { PDFDocument } from "pdf-lib";
import fs from "fs/promises";
import path from "path";
import { UPLOADS_DIR, PDFS_SUBDIR } from "../config/storage";

function extractFileName(input: string): string {
  if (!input) return "";
  if (input.startsWith("http")) {
    const last = input.split("?")[0].split("/").pop() || "";
    return last;
  }
  return input.split("/").pop() || input;
}

export class PDFService {
  private maxSizeMB = 50;

  /**
   * Comprime el PDF y lo guarda en uploads/pdfs/.
   * Devuelve `{ publicId, url }` con el filename listo para almacenar en BD.
   */
  async savePDF(file: any): Promise<{ publicId: string; url: string }> {
    if (file.mimetype !== "application/pdf") {
      throw new Error("El archivo debe ser un PDF");
    }

    const originalSizeMB = file.buffer.length / (1024 * 1024);
    if (originalSizeMB > this.maxSizeMB) {
      throw new Error(`El PDF excede el tamaño máximo de ${this.maxSizeMB}MB`);
    }

    let pdfBuffer: Buffer;

    try {
      const pdfDoc = await PDFDocument.load(file.buffer);
      const compressed = await pdfDoc.save({ useObjectStreams: false });
      pdfBuffer = Buffer.from(compressed);

      const compressedMB = pdfBuffer.length / (1024 * 1024);
      const reduction = (((originalSizeMB - compressedMB) / originalSizeMB) * 100).toFixed(2);
      console.log(`📦 PDF comprimido: ${originalSizeMB.toFixed(2)}MB → ${compressedMB.toFixed(2)}MB (${reduction}% reducción)`);
    } catch {
      console.warn(`⚠️ No se pudo comprimir el PDF, guardando original`);
      pdfBuffer = file.buffer;
    }

    const fileName = `${uuidv4()}.pdf`;
    const destDir = path.join(UPLOADS_DIR, PDFS_SUBDIR);
    await fs.mkdir(destDir, { recursive: true });
    const filePath = path.join(destDir, fileName);
    await fs.writeFile(filePath, pdfBuffer);

    console.log(`✅ PDF guardado en disco: ${fileName}`);
    return { publicId: fileName, url: fileName };
  }

  async deletePDF(urlOrFileName: string): Promise<void> {
    if (!urlOrFileName) return;
    try {
      const fileName = extractFileName(urlOrFileName);
      if (!fileName || !fileName.toLowerCase().endsWith(".pdf")) {
        return;
      }
      const filePath = path.join(UPLOADS_DIR, PDFS_SUBDIR, fileName);
      await fs.unlink(filePath);
      console.log(`🗑️ PDF eliminado: ${fileName}`);
    } catch (error: any) {
      if (error?.code !== "ENOENT") {
        console.error(`Error eliminando PDF: ${urlOrFileName}`, error);
      }
    }
  }

  /**
   * Devuelve la ruta absoluta del PDF en disco si existe, si no null.
   */
  async resolvePDFPath(fileName: string): Promise<string | null> {
    if (!fileName) return null;
    const safeName = path.basename(fileName);
    const filePath = path.join(UPLOADS_DIR, PDFS_SUBDIR, safeName);
    try {
      await fs.access(filePath);
      return filePath;
    } catch {
      return null;
    }
  }

  /** Compatibilidad con código legado — devuelve el filename. */
  getPDFUrl(urlOrFileName: string): string {
    if (urlOrFileName.startsWith("http")) return urlOrFileName;
    return urlOrFileName;
  }

  async duplicatePDF(urlOrFileName: string): Promise<string | null> {
    try {
      const sourceName = extractFileName(urlOrFileName);
      if (!sourceName || !sourceName.toLowerCase().endsWith(".pdf")) {
        return null;
      }
      const sourcePath = path.join(UPLOADS_DIR, PDFS_SUBDIR, sourceName);
      const newName = `${uuidv4()}.pdf`;
      const destPath = path.join(UPLOADS_DIR, PDFS_SUBDIR, newName);
      await fs.copyFile(sourcePath, destPath);
      return newName;
    } catch (error) {
      console.error(`Error duplicando PDF: ${urlOrFileName}`, error);
      return null;
    }
  }

  async getPDFInfo(urlOrFileName: string): Promise<any> {
    try {
      const fileName = extractFileName(urlOrFileName);
      if (!fileName) return null;
      const filePath = path.join(UPLOADS_DIR, PDFS_SUBDIR, fileName);
      const stat = await fs.stat(filePath);
      return {
        publicId: fileName,
        sizeMB: stat.size / (1024 * 1024),
        url: fileName,
      };
    } catch (error) {
      console.error(`Error obteniendo info del PDF: ${urlOrFileName}`, error);
      return null;
    }
  }
}

export const pdfService = new PDFService();
