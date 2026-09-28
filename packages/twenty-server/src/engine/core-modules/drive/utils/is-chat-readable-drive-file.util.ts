import { isNonEmptyString } from '@sniptt/guards';

const CHAT_READABLE_EXTENSIONS = [
  '.md',
  '.txt',
  '.csv',
  '.json',
  '.yml',
  '.yaml',
  '.xml',
  '.html',
  '.css',
  '.js',
  '.ts',
  '.py',
  '.sql',
  '.log',
] as const;

const CHAT_READABLE_MIME_TYPES = [
  'application/json',
  'application/xml',
  'application/javascript',
  'application/x-yaml',
  'application/sql',
] as const;

export const isChatReadableDriveFile = ({
  mimeType,
  name,
}: {
  mimeType?: string | null;
  name: string;
}): boolean => {
  const lowerName = name.toLowerCase();

  if (
    CHAT_READABLE_EXTENSIONS.some((extension) => lowerName.endsWith(extension))
  ) {
    return true;
  }

  if (!isNonEmptyString(mimeType)) {
    return false;
  }

  const lowerMimeType = mimeType.toLowerCase();

  if (lowerMimeType.startsWith('text/')) {
    return true;
  }

  return CHAT_READABLE_MIME_TYPES.some(
    (readableMimeType) => readableMimeType === lowerMimeType,
  );
};
