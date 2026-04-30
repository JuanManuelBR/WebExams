import path from "path";

// Directorio raíz donde se almacenan archivos subidos.
// En dev, por default queda en server/Exams/uploads/.
// En producción se puede sobreescribir con UPLOADS_DIR (p. ej. /var/lib/webexams/uploads).
export const UPLOADS_DIR = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.resolve(__dirname, "../../uploads");

export const IMAGES_SUBDIR = "images";
export const PDFS_SUBDIR = "pdfs";

export const IMAGES_DIR = path.join(UPLOADS_DIR, IMAGES_SUBDIR);
export const PDFS_DIR = path.join(UPLOADS_DIR, PDFS_SUBDIR);
