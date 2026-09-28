const CLIPBOARD_IMAGE_MIME_TYPE = 'image/png';

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Could not load image'));
    image.src = src;
  });

const convertImageBlobToPng = async (blob: Blob): Promise<Blob> => {
  const objectUrl = URL.createObjectURL(blob);

  try {
    const image = await loadImage(objectUrl);
    const canvas = document.createElement('canvas');

    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;

    const context = canvas.getContext('2d');

    if (context === null) {
      throw new Error('Could not convert image');
    }

    context.drawImage(image, 0, 0);

    const pngBlob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, CLIPBOARD_IMAGE_MIME_TYPE);
    });

    if (pngBlob === null) {
      throw new Error('Could not convert image');
    }

    return pngBlob;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

export const copyImageToClipboard = async (url: string): Promise<void> => {
  const response = await fetch(url);

  if (response.status !== 200) {
    throw new Error('Failed downloading file');
  }

  const blob = await response.blob();
  const pngBlob =
    blob.type === CLIPBOARD_IMAGE_MIME_TYPE
      ? blob
      : await convertImageBlobToPng(blob);

  await navigator.clipboard.write([
    new ClipboardItem({
      [CLIPBOARD_IMAGE_MIME_TYPE]: pngBlob,
    }),
  ]);
};
