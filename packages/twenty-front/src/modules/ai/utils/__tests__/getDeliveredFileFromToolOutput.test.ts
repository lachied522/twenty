import { getDeliveredFileFromToolOutput } from '@/ai/utils/getDeliveredFileFromToolOutput';

describe('getDeliveredFileFromToolOutput', () => {
  const deliveredFile = {
    fileId: '1f0c8d2e-3b4a-4c5d-8e6f-7a8b9c0d1e2f',
    filename: 'golden-retriever.png',
    url: 'https://example.com/file.png',
    mimeType: 'image/png',
    sizeBytes: 2048,
  };

  it('reads a nested tool result', () => {
    expect(
      getDeliveredFileFromToolOutput({
        success: true,
        result: deliveredFile,
      }),
    ).toEqual(deliveredFile);
  });

  it('reads fields on the output root', () => {
    expect(getDeliveredFileFromToolOutput(deliveredFile)).toEqual(
      deliveredFile,
    );
  });

  it('returns null when required fields are missing', () => {
    expect(
      getDeliveredFileFromToolOutput({
        success: true,
        result: { filename: 'missing-url.png' },
      }),
    ).toBeNull();
    expect(getDeliveredFileFromToolOutput(null)).toBeNull();
  });
});
