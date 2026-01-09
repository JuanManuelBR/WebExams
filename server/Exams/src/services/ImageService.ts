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
    const fileName = `${uuidv4()}.webp`;
    const filePath = path.join(this.uploadDir, fileName);

    await sharp(file.buffer)
      .webp({ quality: 80 })
      .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
      .toFile(filePath);

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
