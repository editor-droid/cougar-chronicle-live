import { canAccessDashboard, type StaffRole } from '@/lib/roles';

/** Editor images (rich text, link hub, print covers). */
export const MAX_IMAGE_UPLOAD_BYTES = 25 * 1024 * 1024;
/** Print-edition PDFs. Callers of /api/upload do not send video; that goes to Stream. */
export const MAX_PDF_UPLOAD_BYTES = 80 * 1024 * 1024;

const IMAGE_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
};

const PDF_TYPES = new Set(['application/pdf', 'application/x-pdf']);

export const REHOST_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
]);

export function staffCanUpload(role: StaffRole | null | undefined): boolean {
  return canAccessDashboard(role);
}

export function normalizeUploadContentType(contentType: unknown): string {
  if (typeof contentType !== 'string') return '';
  return contentType.toLowerCase().split(';')[0].trim();
}

export type PlannedUpload = {
  key: string;
  contentType: string;
  contentLength: number;
};

/**
 * Staff presign policy for /api/upload.
 * Extension comes from the allowlisted type, not the caller's filename.
 * `contentLength` is signed into the presigned PUT so the object cannot be larger.
 */
export function planStaffUpload(input: {
  filename: unknown;
  contentType: unknown;
  size: unknown;
  now?: number;
  nonce?: string;
}): { ok: true; upload: PlannedUpload } | { ok: false; error: string } {
  const type = normalizeUploadContentType(input.contentType);
  const imageExt = IMAGE_EXT[type];
  const isPdf = PDF_TYPES.has(type);
  if (!imageExt && !isPdf) {
    return {
      ok: false,
      error: 'That file type is not allowed. Use a JPEG, PNG, WebP, GIF, AVIF, or PDF.',
    };
  }

  const max = isPdf ? MAX_PDF_UPLOAD_BYTES : MAX_IMAGE_UPLOAD_BYTES;
  const size = typeof input.size === 'number' ? input.size : Number.NaN;
  if (!Number.isInteger(size) || size <= 0) {
    return { ok: false, error: 'Missing file size' };
  }
  if (size > max) {
    const mb = Math.round(max / (1024 * 1024));
    return { ok: false, error: `File is larger than ${mb} MB` };
  }

  if (typeof input.filename !== 'string' || !input.filename.trim()) {
    return { ok: false, error: 'Missing filename or contentType' };
  }

  const ext = imageExt || 'pdf';
  const contentType = isPdf ? 'application/pdf' : type === 'image/jpg' ? 'image/jpeg' : type;
  const stem = sanitizeUploadStem(input.filename);
  const now = input.now ?? Date.now();
  const nonce = (input.nonce ?? Math.random().toString(36).slice(2, 10))
    .replace(/[^a-z0-9]/gi, '')
    .slice(0, 12) || 'file';

  return {
    ok: true,
    upload: {
      key: `uploads/${now}-${nonce}-${stem}.${ext}`,
      contentType,
      contentLength: size,
    },
  };
}

/** Basename only, no path segments, no `..`. */
export function sanitizeUploadStem(filename: string): string {
  const base = filename.split(/[/\\]/).pop() || 'file';
  const noExt = base.replace(/\.[^.]+$/, '');
  const cleaned = noExt
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48);
  return cleaned || 'file';
}
