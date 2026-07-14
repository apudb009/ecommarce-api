import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { UploadService } from './upload.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

const imageFilter = (
  req: any,
  file: Express.Multer.File,
  cb: (error: Error | null, acceptFile: boolean) => void,
) => {
  if (!file.mimetype.match(/\/(jpg|jpeg|png|webp|gif)$/)) {
    cb(new BadRequestException('Only image files are allowed'), false);
  } else {
    cb(null, true);
  }
};

@Controller('api/upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  // POST /api/upload/image
  @Post('image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      fileFilter: imageFilter,
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    }),
  )
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    return this.uploadService.uploadImage(file, 'shopapp/products');
  }

  // POST /api/upload/images (multiple)
  @Post('images')
  @UseInterceptors(
    FileInterceptor('files', {
      storage: memoryStorage(),
      fileFilter: imageFilter,
      limits: {
        fileSize: 5 * 1024 * 1024,
        files: 10,
      }, // 5MB
    }),
  )
  async uploadImages(@UploadedFile() files: Express.Multer.File[]) {
    return this.uploadService.uploadImages(files, 'shopapp/products');
  }

  // POST /api/upload/avatar
  @Post('avatar')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      fileFilter: imageFilter,
      limits: { fileSize: 1 * 1024 * 1024 }, // 1MB
    }),
  )
  async uploadAvatar(@UploadedFile() file: Express.Multer.File) {
    return this.uploadService.uploadImage(file, 'shopapp/avatars');
  }
}
