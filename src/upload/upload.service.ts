import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UploadApiResponse, v2 as cloudinary } from 'cloudinary';

@Injectable()
export class UploadService {
  constructor(private config: ConfigService) {
    cloudinary.config({
      cloud_name: this.config.getOrThrow('CLOUDINARY_CLOUD_NAME'),
      api_key: this.config.getOrThrow('CLOUDINARY_API_KEY'),
      api_secret: this.config.getOrThrow('CLOUDINARY_API_SECRET'),
    });
  }

  // ── UPLOAD SINGLE IMAGE ────────────────────────────
  async uploadImage(
    file: Express.Multer.File,
    folder: string,
  ): Promise<{ url: string; publicId: string }> {
    if (!file) throw new BadRequestException('No file provided');

    return new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder,
            transformation: [
              { width: 1200, height: 1200, crop: 'limit' },
              { quality: 'auto', fetch_format: 'auto' },
            ],
          },
          (error, result) => {
            if (error || !result) {
              reject(new BadRequestException('Upload failed'));
              return;
            }
            resolve({
              url: result.secure_url,
              publicId: result.public_id,
            });
          },
        )
        .end(file.buffer);
    });
  }

  // ── UPLOAD MULTIPLE IMAGES ─────────────────────────
  async uploadImages(
    files: Express.Multer.File[],
    folder: string,
  ): Promise<{ url: string; publicId: string }[]> {
    return Promise.all(files.map((file) => this.uploadImage(file, folder)));
  }

  // ── DELETE IMAGE ───────────────────────────────────
  async deleteImage(publicId: string): Promise<UploadApiResponse> {
    return cloudinary.uploader.destroy(publicId) as Promise<UploadApiResponse>;
  }
}
