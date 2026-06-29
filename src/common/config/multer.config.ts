import { diskStorage } from 'multer';
import { extname } from 'path';

export const multerConfig = {
  storage: diskStorage({
    destination: './uploads/avatars',
    filename: (req, file, cb) => {
      const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${uniqueName}${extname(file.originalname)}`);
    },
  }),
  fileFilter: (req, file, cb) => {
    // allow images only
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      cb(new Error('Only image files are allowed'), false);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      cb(null, true);
    }
  },
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB max
  },
};
