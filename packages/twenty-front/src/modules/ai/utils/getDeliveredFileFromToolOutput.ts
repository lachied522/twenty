import { isNonEmptyString } from '@sniptt/guards';

export type DeliveredFile = {
  fileId: string;
  filename: string;
  url: string;
  mimeType: string;
  sizeBytes?: number;
};

const readDeliveredFile = (
  value: Record<string, unknown>,
): DeliveredFile | null => {
  const fileId = value.fileId;
  const filename = value.filename;
  const url = value.url;
  const mimeType = value.mimeType;
  const sizeBytes = value.sizeBytes;

  if (
    !isNonEmptyString(fileId) ||
    !isNonEmptyString(filename) ||
    !isNonEmptyString(url) ||
    !isNonEmptyString(mimeType)
  ) {
    return null;
  }

  return {
    fileId,
    filename,
    url,
    mimeType,
    sizeBytes: typeof sizeBytes === 'number' ? sizeBytes : undefined,
  };
};

export const getDeliveredFileFromToolOutput = (
  output: unknown,
): DeliveredFile | null => {
  if (typeof output !== 'object' || output === null) {
    return null;
  }

  const outputRecord = output as Record<string, unknown>;
  const fromRoot = readDeliveredFile(outputRecord);

  if (fromRoot) {
    return fromRoot;
  }

  if (typeof outputRecord.result === 'object' && outputRecord.result !== null) {
    return readDeliveredFile(outputRecord.result as Record<string, unknown>);
  }

  return null;
};
