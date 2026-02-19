import { Request, Response } from 'express';
import { imageService } from '../services/ImageService';

export class ImageController {
  static async upload(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No se proporcionó imagen' });
      }

      const { publicId, url } = await imageService.saveImage(req.file);

      return res.status(200).json({
        message: 'Imagen subida exitosamente',
        nombreImagen: url,
        publicId,
        url
      });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  }

  static async get(req: Request, res: Response) {
    try {
      const { fileName } = req.params;
      const url = imageService.getImageUrl(fileName);
      return res.redirect(url);
    } catch (error: any) {
      return res.status(404).json({ message: 'Imagen no encontrada' });
    }
  }

  static async delete(req: Request, res: Response) {
    try {
      const { fileName } = req.params;
      await imageService.deleteImage(fileName);
      return res.status(200).json({ message: 'Imagen eliminada exitosamente' });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  }
}