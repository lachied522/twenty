import { sanitizeGeneratedImageFilename } from 'src/engine/core-modules/tool/tools/image-generate-tool/utils/sanitize-generated-image-filename.util';

describe('sanitizeGeneratedImageFilename', () => {
  it('appends the mime extension when none is present', () => {
    expect(
      sanitizeGeneratedImageFilename({
        filename: 'golden-retriever-puppy',
        mimeType: 'image/png',
      }),
    ).toBe('golden-retriever-puppy.png');
  });

  it('replaces a mismatched extension', () => {
    expect(
      sanitizeGeneratedImageFilename({
        filename: 'photo.jpg',
        mimeType: 'image/webp',
      }),
    ).toBe('photo.webp');
  });

  it('strips path segments and unsafe characters', () => {
    expect(
      sanitizeGeneratedImageFilename({
        filename: '../../weird name!.png',
        mimeType: 'image/png',
      }),
    ).toBe('weird-name-.png');
  });

  it('falls back to generated-image when filename is missing', () => {
    expect(
      sanitizeGeneratedImageFilename({
        mimeType: 'image/png',
      }),
    ).toBe('generated-image.png');
  });
});
