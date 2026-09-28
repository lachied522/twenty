import { copyImageToClipboard } from '@/activities/files/utils/copyImageToClipboard';

const PNG_BLOB = new Blob(['png'], { type: 'image/png' });
const JPEG_BLOB = new Blob(['jpeg'], { type: 'image/jpeg' });
const PNG_FROM_CANVAS = new Blob(['converted'], { type: 'image/png' });

describe('copyImageToClipboard', () => {
  const writeMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    Object.assign(navigator, {
      clipboard: { write: writeMock },
    });
    global.ClipboardItem = class {
      constructor(public items: Record<string, Blob>) {}
    } as unknown as typeof ClipboardItem;
  });

  it('writes a png blob to the clipboard', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      status: 200,
      blob: () => Promise.resolve(PNG_BLOB),
    });

    await copyImageToClipboard('https://example.com/file.png');

    expect(writeMock).toHaveBeenCalledTimes(1);
    const clipboardItem = writeMock.mock.calls[0][0][0] as {
      items: Record<string, Blob>;
    };

    expect(clipboardItem.items['image/png']).toBe(PNG_BLOB);
  });

  it('converts a jpeg blob to png before copying', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      status: 200,
      blob: () => Promise.resolve(JPEG_BLOB),
    });
    global.URL.createObjectURL = jest.fn(() => 'blob:image');
    global.URL.revokeObjectURL = jest.fn();

    Object.defineProperty(global.Image.prototype, 'naturalWidth', {
      configurable: true,
      get: () => 1,
    });
    Object.defineProperty(global.Image.prototype, 'naturalHeight', {
      configurable: true,
      get: () => 1,
    });
    jest
      .spyOn(global.Image.prototype, 'src', 'set')
      .mockImplementation(function (this: HTMLImageElement) {
        this.onload?.(new Event('load'));
      });

    HTMLCanvasElement.prototype.getContext = jest.fn().mockReturnValue({
      drawImage: jest.fn(),
    });
    HTMLCanvasElement.prototype.toBlob = jest.fn((callback) => {
      callback(PNG_FROM_CANVAS);
    });

    await copyImageToClipboard('https://example.com/file.jpg');

    expect(writeMock).toHaveBeenCalledTimes(1);
    const clipboardItem = writeMock.mock.calls[0][0][0] as {
      items: Record<string, Blob>;
    };

    expect(clipboardItem.items['image/png']).toBe(PNG_FROM_CANVAS);
  });

  it('rejects when the file cannot be fetched', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      status: 404,
      blob: () => Promise.resolve(PNG_BLOB),
    });

    await expect(
      copyImageToClipboard('https://example.com/missing.png'),
    ).rejects.toThrow('Failed downloading file');
  });
});
