import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { isS3Enabled, uploadFileToS3, ensureLocalTemplatesDir } from '../config/storage';

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// File filter for asset uploads
const fileFilter = (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Extended list to include common file types
  const allowedTypes = /jpeg|jpg|png|gif|svg|webp|mp4|webm|woff|woff2|ttf|pdf|doc|docx|xls|xlsx|ppt|pptx|zip|json|csv|txt/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());

  // For general files, also allow by extension
  if (extname) {
    return cb(null, true);
  }

  // Check mimetype for images/videos
  const allowedMimetypes = /image|video|font|application\/pdf|application\/msword|application\/vnd\.|text\//;
  if (allowedMimetypes.test(file.mimetype)) {
    return cb(null, true);
  }

  cb(new Error('Invalid file type.'));
};

// Use memory storage; handler can upload to S3 if enabled, or write to disk afterwards.
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB default for assets
  fileFilter,
});

// Helper to persist a multer memory file to either S3 or disk
export const persistUploadedFile = async (file: Express.Multer.File, destPath?: string) => {
  if (!file) throw new Error('No file provided');

  if (isS3Enabled()) {
    const key = `assets/${Date.now()}-${file.originalname}`;
    // write temp file then upload
    const tmpDir = ensureLocalTemplatesDir();
    const tmpPath = path.join(tmpDir, `tmp-${Date.now()}-${file.originalname}`);
    fs.writeFileSync(tmpPath, file.buffer);
    const url = await uploadFileToS3(tmpPath, key, file.mimetype);
    try { fs.unlinkSync(tmpPath); } catch {}
    return url;
  }

  // Fallback: write to local uploads
  const outPath = destPath || path.join(uploadsDir, `${Date.now()}-${file.originalname}`);
  fs.writeFileSync(outPath, file.buffer);
  return `/uploads/${path.basename(outPath)}`;
};
