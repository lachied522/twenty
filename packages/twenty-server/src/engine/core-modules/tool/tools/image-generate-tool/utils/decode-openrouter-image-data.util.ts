import { type OpenRouterImageResponse } from 'src/engine/core-modules/tool/tools/image-generate-tool/types/openrouter-image-response.type';

export type DecodedOpenRouterImage = {
  buffer: Buffer;
  mimeType: string;
};

const DEFAULT_IMAGE_MIME_TYPE = 'image/png';

const stripBase64Prefix = (value: string): string => {
  const commaIndex = value.indexOf(',');

  if (value.startsWith('data:') && commaIndex !== -1) {
    return value.slice(commaIndex + 1);
  }

  return value;
};

export const decodeOpenRouterImageData = (
  response: OpenRouterImageResponse,
): DecodedOpenRouterImage | null => {
  const imageData = response.data?.[0];

  if (!imageData) {
    return null;
  }

  const mimeType = imageData.media_type ?? DEFAULT_IMAGE_MIME_TYPE;

  if (typeof imageData.b64_json === 'string' && imageData.b64_json.length > 0) {
    return {
      buffer: Buffer.from(stripBase64Prefix(imageData.b64_json), 'base64'),
      mimeType,
    };
  }

  if (typeof imageData.url === 'string' && imageData.url.startsWith('data:')) {
    const commaIndex = imageData.url.indexOf(',');
    const header = imageData.url.slice(5, commaIndex);
    const dataMimeType = header.split(';')[0] || mimeType;

    return {
      buffer: Buffer.from(imageData.url.slice(commaIndex + 1), 'base64'),
      mimeType: dataMimeType,
    };
  }

  return null;
};
