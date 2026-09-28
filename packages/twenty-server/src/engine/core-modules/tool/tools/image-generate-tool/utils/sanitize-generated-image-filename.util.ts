import path from 'path';

const MIME_TYPE_TO_EXTENSION: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

const DEFAULT_FILENAME = 'generated-image';

export const sanitizeGeneratedImageFilename = ({
  filename,
  mimeType,
}: {
  filename?: string;
  mimeType: string;
}): string => {
  const extension = MIME_TYPE_TO_EXTENSION[mimeType] ?? 'png';
  const rawBase = path
    .basename(filename ?? DEFAULT_FILENAME)
    .replace(/[^a-zA-Z0-9._-]/g, '-');
  const withoutExtension = rawBase.replace(/\.[^.]+$/, '');
  const safeBase =
    withoutExtension.length > 0 ? withoutExtension : DEFAULT_FILENAME;

  return `${safeBase}.${extension}`;
};
