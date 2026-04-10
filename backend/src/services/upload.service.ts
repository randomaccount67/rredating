import { db } from './db.js';
import { badRequest } from '../utils/errors.js';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE = 8 * 1024 * 1024; // 8MB

/** Map validated MIME types to safe file extensions (M3 fix) */
const EXT_MAP: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

export async function uploadAvatar(
  authUserId: string,
  file: { buffer: Buffer; mimetype: string; originalname: string; size: number }
) {
  if (!file) throw badRequest('No file provided');
  if (file.size > MAX_SIZE) throw badRequest('File too large (max 8MB)');

  // C5 fix: Validate magic bytes instead of trusting client-provided MIME type
  const { fileTypeFromBuffer } = await import('file-type');
  const detected = await fileTypeFromBuffer(file.buffer);

  if (!detected || !ALLOWED_TYPES.includes(detected.mime)) {
    throw badRequest('Only JPEG, PNG, WebP, and GIF images are allowed');
  }

  // M3 fix: Derive extension from validated MIME type, not user-supplied filename
  const ext = EXT_MAP[detected.mime] || 'jpg';
  const path = `avatars/${authUserId}-${Date.now()}.${ext}`;

  const { error } = await db.storage
    .from('avatars')
    .upload(path, file.buffer, {
      contentType: detected.mime,
      upsert: true,
    });

  if (error) throw new Error(error.message);

  const { data: { publicUrl } } = db.storage.from('avatars').getPublicUrl(path);

  return { url: publicUrl };
}
