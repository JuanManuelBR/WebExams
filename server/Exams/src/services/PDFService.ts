// src/services/PDFService.ts
import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { PDFDocument } from "pdf-lib";

export class PDFService {
  private uploadDir = path.join(__dirname, "../../uploads/pdfs");
  private tempDir = path.join(__dirname, "../../uploads/temp");
  private maxSizeMB = 50; // ✅ Tamaño máximo aumentado a 50MB (era 10MB)

  constructor() {
    this.ensureUploadDir();
  }

  private async ensureUploadDir() {
    const dirs = [this.uploadDir, this.tempDir];
    
    for (const dir of dirs) {
      try {
        await fs.access(dir);
      } catch {
        await fs.mkdir(dir, { recursive: true });
        console.log(`📁 Carpeta creada: ${dir}`);
      }
    }
  }

  async savePDF(file: any): Promise<string> {
    // Validar que sea un PDF
    if (file.mimetype !== "application/pdf") {
      throw new Error("El archivo debe ser un PDF");
    }

    // Validar tamaño inicial
    const originalSizeMB = file.buffer.length / (1024 * 1024);
    if (originalSizeMB > this.maxSizeMB) {
      throw new Error(`El PDF excede el tamaño máximo permitido de ${this.maxSizeMB}MB`);
    }

    const fileName = `${uuidv4()}.pdf`;
    const filePath = path.join(this.uploadDir, fileName);

    try {
      // Cargar el PDF
      const pdfDoc = await PDFDocument.load(file.buffer);

      // Comprimir el PDF eliminando objetos innecesarios
      const compressedPdfBytes = await pdfDoc.save({
        useObjectStreams: false, // Mejor compresión
      });

      // Guardar el PDF comprimido
      await fs.writeFile(filePath, compressedPdfBytes);

      const compressedSizeMB = compressedPdfBytes.length / (1024 * 1024);
      const reduction = ((originalSizeMB - compressedSizeMB) / originalSizeMB * 100).toFixed(2);

      console.log(`✅ PDF guardado: ${fileName}`);
      console.log(`   📊 Tamaño original: ${originalSizeMB.toFixed(2)}MB`);
      console.log(`   📦 Tamaño comprimido: ${compressedSizeMB.toFixed(2)}MB`);
      console.log(`   🔽 Reducción: ${reduction}%`);

      return fileName;
    } catch (error) {
      // Si falla la compresión, guardar el PDF original
      console.warn(`⚠️ No se pudo comprimir el PDF, guardando original`);
      await fs.writeFile(filePath, file.buffer);
      console.log(`✅ PDF guardado sin comprimir: ${fileName} (${originalSizeMB.toFixed(2)}MB)`);
      return fileName;
    }
  }

  async deletePDF(fileName: string): Promise<void> {
    const filePath = path.join(this.uploadDir, fileName);
    try {
      await fs.unlink(filePath);
      console.log(`🗑️ PDF eliminado: ${fileName}`);
    } catch (error) {
      console.error(`❌ Error eliminando PDF: ${fileName}`, error);
    }
  }

  getPDFPath(fileName: string): string {
    return path.join(this.uploadDir, fileName);
  }

  async duplicatePDF(originalFileName: string): Promise<string | null> {
    const originalPath = path.join(this.uploadDir, originalFileName);
    try {
      await fs.access(originalPath);
      const newFileName = `${uuidv4()}.pdf`;
      const newPath = path.join(this.uploadDir, newFileName);
      await fs.copyFile(originalPath, newPath);
      return newFileName;
    } catch (error) {
      console.error(`Error duplicando PDF: ${originalFileName}`, error);
      return null;
    }
  }

  async getPDFSize(fileName: string): Promise<number> {
    const filePath = path.join(this.uploadDir, fileName);
    try {
      const stats = await fs.stat(filePath);
      return stats.size / (1024 * 1024); // Retorna en MB
    } catch (error) {
      console.error(`Error obteniendo tamaño del PDF: ${fileName}`, error);
      return 0;
    }
  }

  async getPDFInfo(fileName: string): Promise<any> {
    const filePath = path.join(this.uploadDir, fileName);
    try {
      const pdfBytes = await fs.readFile(filePath);
      const pdfDoc = await PDFDocument.load(pdfBytes);
      
      return {
        fileName,
        pageCount: pdfDoc.getPageCount(),
        sizeMB: pdfBytes.length / (1024 * 1024),
        title: pdfDoc.getTitle() || 'Sin título',
        author: pdfDoc.getAuthor() || 'Desconocido',
      };
    } catch (error) {
      console.error(`Error obteniendo info del PDF: ${fileName}`, error);
      return null;
    }
  }

  async listPDFs(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.uploadDir);
      return files.filter(file => file.endsWith('.pdf'));
    } catch (error) {
      console.error('Error listando PDFs:', error);
      return [];
    }
  }

  // Método para limpiar PDFs antiguos (opcional)
  async cleanOldPDFs(daysOld: number = 30): Promise<void> {
    try {
      const files = await fs.readdir(this.uploadDir);
      const now = Date.now();
      const maxAge = daysOld * 24 * 60 * 60 * 1000;

      for (const file of files) {
        if (file.endsWith('.pdf')) {
          const filePath = path.join(this.uploadDir, file);
          const stats = await fs.stat(filePath);
          const age = now - stats.mtimeMs;

          if (age > maxAge) {
            await fs.unlink(filePath);
            console.log(`🧹 PDF antiguo eliminado: ${file}`);
          }
        }
      }
    } catch (error) {
      console.error('Error limpiando PDFs antiguos:', error);
    }
  }
}

export const pdfService = new PDFService();