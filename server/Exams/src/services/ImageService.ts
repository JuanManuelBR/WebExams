// src/services/image.service.ts
import sharp from "sharp";
import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

export class ImageService {
  private uploadDir = path.join(__dirname, "../../uploads/images");

  constructor() {
    this.ensureUploadDir();
  }

  private async ensureUploadDir() {
    try {
      await fs.access(this.uploadDir);
    } catch {
      await fs.mkdir(this.uploadDir, { recursive: true });
    }
  }

  async saveImage(file: any): Promise<string> {
    const isGif = file.mimetype === "image/gif";

    const extension = isGif ? "gif" : "webp";
    const fileName = `${uuidv4()}.${extension}`;
    const filePath = path.join(this.uploadDir, fileName);

    const image = sharp(file.buffer, { animated: true });

    if (isGif) {
      // Mantener GIF animado, optimizado
      await image
        .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
        .gif({
          loop: 0, // infinito
          effort: 7, // compresión (1–10)
          dither: 0.5, // calidad visual
        })
        .toFile(filePath);
    } else {
      // Imágenes normales → WebP
      await image
        .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 80 })
        .toFile(filePath);
    }

    return fileName;
  }

  async deleteImage(fileName: string): Promise<void> {
    const filePath = path.join(this.uploadDir, fileName);
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.error(`Error eliminando imagen: ${fileName}`, error);
    }
  }

  getImagePath(fileName: string): string {
    return path.join(this.uploadDir, fileName);
  }
}

export const imageService = new ImageService();
