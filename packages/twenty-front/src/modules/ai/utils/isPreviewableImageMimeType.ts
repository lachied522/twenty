import { isNonEmptyString } from '@sniptt/guards';

const PREVIEWABLE_IMAGE_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif',
  'image/webp',
];

export const isPreviewableImageMimeType = (mimeType?: string): boolean =>
  isNonEmptyString(mimeType) && PREVIEWABLE_IMAGE_MIME_TYPES.includes(mimeType);
