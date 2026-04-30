import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";
import fs from "fs/promises";
import path from "path";
import { UPLOADS_DIR, IMAGES_SUBDIR } from "../config/storage";

// Extrae el nombre de archivo de una URL/path/ID heredado.
// Soporta:
//   - filename plano: "abc.webp"
//   - URL antigua de Cloudinary con publicId tipo "exams/images/<uuid>"
//   - URL completa http(s): toma el último segmento
function extractFileName(input: string): string {
  if (!input) return "";
  if (input.startsWith("http")) {
    const last = input.split("?")[0].split("/").pop() || "";
    return last;
  }
  // legacy publicId "exams/images/<uuid>" sin extensión → no podemos resolver,
  // se devuelve el último segmento; el caller manejará el caso de no-encontrado
  return input.split("/").pop() || input;
}

export class ImageService {
  /**
   * Procesa la imagen (resize + conversión) y la guarda en uploads/images/.
   * Devuelve `{ publicId, url }` donde:
   *   - publicId = nombre del archivo guardado (ej. "abc123.webp")
   *   - url = mismo nombre, listo para almacenar en BD; el frontend
   *     prepende `${EXAMS_API_URL}/api/images/` cuando no empieza con http.
   */
  async saveImage(file: any): Promise<{ publicId: string; url: string }> {
    const isGif = file.mimetype === "image/gif";

    let processedBuffer: Buffer;
    let extension: string;

    if (isGif) {
      processedBuffer = await sharp(file.buffer, { animated: true })
        .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
        .gif({ loop: 0, effort: 7, dither: 0.5 })
        .toBuffer();
      extension = "gif";
    } else {
      processedBuffer = await sharp(file.buffer)
        .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();
      extension = "webp";
    }

    const fileName = `${uuidv4()}.${extension}`;
    const destDir = path.join(UPLOADS_DIR, IMAGES_SUBDIR);
    await fs.mkdir(destDir, { recursive: true });
    const filePath = path.join(destDir, fileName);
    await fs.writeFile(filePath, processedBuffer);

    console.log(`✅ Imagen guardada en disco: ${fileName}`);
    return { publicId: fileName, url: fileName };
  }

  async deleteImage(urlOrFileName: string): Promise<void> {
    if (!urlOrFileName) return;
    try {
      const fileName = extractFileName(urlOrFileName);
      if (!fileName || !fileName.includes(".")) {
        // legacy Cloudinary publicId sin extensión: nada que borrar localmente
        return;
      }
      const filePath = path.join(UPLOADS_DIR, IMAGES_SUBDIR, fileName);
      await fs.unlink(filePath);
      console.log(`🗑️ Imagen eliminada: ${fileName}`);
    } catch (error: any) {
      if (error?.code !== "ENOENT") {
        console.error(`Error eliminando imagen: ${urlOrFileName}`, error);
      }
    }
  }

  /**
   * Resuelve la ruta absoluta del archivo en disco para servirlo.
   * Devuelve null si el archivo no existe.
   */
  async resolveImagePath(fileName: string): Promise<string | null> {
    if (!fileName) return null;
    const safeName = path.basename(fileName); // protege contra path traversal
    const filePath = path.join(UPLOADS_DIR, IMAGES_SUBDIR, safeName);
    try {
      await fs.access(filePath);
      return filePath;
    } catch {
      return null;
    }
  }

  /**
   * Compatibilidad con código legado: devuelve el nombre del archivo.
   * El frontend ya sabe construir la URL con `${EXAMS_API_URL}/api/images/${nombre}`.
   */
  getImageUrl(urlOrFileName: string): string {
    if (urlOrFileName.startsWith("http")) return urlOrFileName;
    return urlOrFileName;
  }

  /**
   * Duplica un archivo existente (para clonación de exámenes).
   * Devuelve el nuevo filename o null si la fuente no se puede leer.
   */
  async duplicateImage(urlOrFileName: string): Promise<string | null> {
    try {
      const sourceName = extractFileName(urlOrFileName);
      if (!sourceName || !sourceName.includes(".")) {
        // legacy publicId sin extensión — no podemos duplicar localmente
        return null;
      }
      const sourcePath = path.join(UPLOADS_DIR, IMAGES_SUBDIR, sourceName);
      const ext = path.extname(sourceName).slice(1) || "webp";
      const newName = `${uuidv4()}.${ext}`;
      const destPath = path.join(UPLOADS_DIR, IMAGES_SUBDIR, newName);
      await fs.copyFile(sourcePath, destPath);
      return newName;
    } catch (error) {
      console.error(`Error duplicando imagen: ${urlOrFileName}`, error);
      return null;
    }
  }
}

export const imageService = new ImageService();
