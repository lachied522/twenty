import { isChatReadableDriveFile } from 'src/engine/core-modules/drive/utils/is-chat-readable-drive-file.util';

describe('isChatReadableDriveFile', () => {
  it('accepts markdown and text by extension even when mime is missing', () => {
    expect(isChatReadableDriveFile({ mimeType: null, name: 'notes.md' })).toBe(
      true,
    );
    expect(
      isChatReadableDriveFile({ mimeType: undefined, name: 'log.txt' }),
    ).toBe(true);
  });

  it('accepts text/* mime types', () => {
    expect(
      isChatReadableDriveFile({
        mimeType: 'text/plain',
        name: 'untitled',
      }),
    ).toBe(true);
  });

  it('rejects PDFs and images', () => {
    expect(
      isChatReadableDriveFile({
        mimeType: 'application/pdf',
        name: 'invoice.pdf',
      }),
    ).toBe(false);
    expect(
      isChatReadableDriveFile({
        mimeType: 'image/png',
        name: 'chart.png',
      }),
    ).toBe(false);
  });
});
