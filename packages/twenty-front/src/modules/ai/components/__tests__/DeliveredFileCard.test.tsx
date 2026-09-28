import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { copyImageToClipboard } from '@/activities/files/utils/copyImageToClipboard';
import { downloadFile } from '@/activities/files/utils/downloadFile';
import { DeliveredFileCard } from '@/ai/components/DeliveredFileCard';

jest.mock('@/activities/files/utils/downloadFile', () => ({
  downloadFile: jest.fn(),
}));

jest.mock('@/activities/files/utils/copyImageToClipboard', () => ({
  copyImageToClipboard: jest.fn(),
}));

jest.mock('@/ui/feedback/snack-bar-manager/hooks/useSnackBar', () => ({
  useSnackBar: () => ({
    enqueueSuccessSnackBar: jest.fn(),
    enqueueErrorSnackBar: jest.fn(),
  }),
}));

beforeEach(() => {
  i18n.load('en', {});
  i18n.activate('en');
  jest.clearAllMocks();
  jest.mocked(copyImageToClipboard).mockResolvedValue(undefined);
});

type RenderCardProps = {
  filename?: string;
  url?: string;
  mimeType?: string;
  sizeBytes?: number;
};

const renderCard = ({
  filename = 'golden-retriever.png',
  url = 'https://example.com/file.png',
  mimeType = 'image/png',
  sizeBytes = 2048,
}: RenderCardProps = {}) =>
  render(
    <I18nProvider i18n={i18n}>
      <DeliveredFileCard
        filename={filename}
        url={url}
        mimeType={mimeType}
        sizeBytes={sizeBytes}
      />
    </I18nProvider>,
  );

describe('DeliveredFileCard', () => {
  it('shows an image preview and downloads the file', async () => {
    const user = userEvent.setup();

    renderCard();

    expect(screen.getByText('Image ready')).toBeVisible();
    expect(screen.getByText('golden-retriever.png')).toBeVisible();
    expect(screen.getByText('2.0 KB')).toBeVisible();
    expect(
      screen.getByRole('img', { name: 'golden-retriever.png' }),
    ).toHaveAttribute('src', 'https://example.com/file.png');

    await user.click(screen.getByRole('button', { name: 'Download' }));

    expect(downloadFile).toHaveBeenCalledWith(
      'https://example.com/file.png',
      'golden-retriever.png',
    );
  });

  it('opens an inspect overlay when the image is clicked', async () => {
    const user = userEvent.setup();

    renderCard();

    await user.click(screen.getByRole('button', { name: 'View image' }));

    const overlay = screen.getByRole('dialog', { name: 'Image' });

    expect(overlay).toBeVisible();
    expect(within(overlay).getByRole('button', { name: 'Copy' })).toBeVisible();
    expect(
      within(overlay).getByRole('button', { name: 'Zoom in' }),
    ).toBeVisible();
    expect(
      within(overlay).getByRole('button', { name: 'Zoom out' }),
    ).toBeVisible();

    await user.click(within(overlay).getByRole('button', { name: 'Copy' }));
    expect(copyImageToClipboard).toHaveBeenCalledWith(
      'https://example.com/file.png',
    );

    await user.click(within(overlay).getByRole('button', { name: 'Download' }));
    expect(downloadFile).toHaveBeenCalledWith(
      'https://example.com/file.png',
      'golden-retriever.png',
    );
  });

  it('closes the overlay from the close control', async () => {
    const user = userEvent.setup();

    renderCard();

    await user.click(screen.getByRole('button', { name: 'View image' }));
    await user.click(screen.getByRole('button', { name: 'Close' }));

    expect(screen.queryByRole('dialog', { name: 'Image' })).toBeNull();
  });

  it('hides the preview for non-image files', () => {
    renderCard({
      filename: 'report.pdf',
      url: 'https://example.com/report.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 1024,
    });

    expect(screen.getByText('File ready')).toBeVisible();
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.queryByRole('button', { name: 'View image' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Download' })).toBeVisible();
  });
});
