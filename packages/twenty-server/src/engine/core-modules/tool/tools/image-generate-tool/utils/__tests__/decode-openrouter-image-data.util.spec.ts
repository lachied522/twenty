import { decodeOpenRouterImageData } from 'src/engine/core-modules/tool/tools/image-generate-tool/utils/decode-openrouter-image-data.util';

describe('decodeOpenRouterImageData', () => {
  it('decodes b64_json with the declared mime type', () => {
    const decoded = decodeOpenRouterImageData({
      data: [
        {
          b64_json: Buffer.from('png-bytes').toString('base64'),
          media_type: 'image/png',
        },
      ],
    });

    expect(decoded?.mimeType).toBe('image/png');
    expect(decoded?.buffer.toString()).toBe('png-bytes');
  });

  it('decodes a data URL when b64_json is missing', () => {
    const decoded = decodeOpenRouterImageData({
      data: [
        {
          url: `data:image/webp;base64,${Buffer.from('webp-bytes').toString('base64')}`,
        },
      ],
    });

    expect(decoded?.mimeType).toBe('image/webp');
    expect(decoded?.buffer.toString()).toBe('webp-bytes');
  });

  it('returns null when no image payload is present', () => {
    expect(decodeOpenRouterImageData({ data: [] })).toBeNull();
    expect(decodeOpenRouterImageData({})).toBeNull();
  });
});
