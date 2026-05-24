import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';

const region = process.env.AWS_REGION;
const bucket = process.env.TEMPLATES_S3_BUCKET;

let s3: S3Client | null = null;
if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && region) {
  s3 = new S3Client({ region });
}

export const isS3Enabled = () => Boolean(s3 && bucket);

export const uploadFileToS3 = async (localPath: string, key: string, contentType?: string) => {
  if (!s3 || !bucket) throw new Error('S3 is not configured');

  const body = fs.createReadStream(localPath);
  const cmd = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType || 'application/octet-stream',
  });

  await s3.send(cmd);
  return `https://${bucket}.s3.${region}.amazonaws.com/${encodeURIComponent(key)}`;
};

export const ensureLocalTemplatesDir = () => {
  const dir = path.join(__dirname, '../../uploads/templates');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
};

export default {}
