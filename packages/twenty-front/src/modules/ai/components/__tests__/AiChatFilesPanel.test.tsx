import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ToolUIPart } from 'ai';
import { Provider as JotaiProvider } from 'jotai';
import { type ReactNode, useMemo } from 'react';
import { ThemeProvider } from 'twenty-ui/theme-constants';

import { downloadFile } from '@/activities/files/utils/downloadFile';
import { AiChatFilesButton } from '@/ai/components/AiChatFilesButton';
import { AiChatFilesPanel } from '@/ai/components/AiChatFilesPanel';
import { ToolStepRenderer } from '@/ai/components/ToolStepRenderer';
import { AiChatFilesContext } from '@/ai/contexts/AiChatFilesContext';
import { useAiChatFilesPanel } from '@/ai/hooks/useAiChatFilesPanel';
import { useRegisterAiChatFile } from '@/ai/hooks/useRegisterAiChatFile';
import {
  jotaiStore,
  resetJotaiStore,
} from '@/ui/utilities/state/jotai/jotaiStore';

let mockIsMobile = false;

jest.mock('twenty-ui/utilities', () => ({
  ...jest.requireActual('twenty-ui/utilities'),
  useIsMobile: () => mockIsMobile,
}));

jest.mock('@/ai/hooks/useToolDisplayContext', () => ({
  useToolDisplayContext: () => ({
    labelByName: new Map(),
    indexByName: new Map(),
    objectMetadataItems: [],
  }),
}));

jest.mock('~/hooks/useCopyToClipboard', () => ({
  useCopyToClipboard: () => ({ copyToClipboard: jest.fn() }),
}));

jest.mock('@/activities/files/utils/downloadFile', () => ({
  downloadFile: jest.fn(),
}));

jest.mock('@/ui/feedback/snack-bar-manager/hooks/useSnackBar', () => ({
  useSnackBar: () => ({
    enqueueSuccessSnackBar: jest.fn(),
    enqueueErrorSnackBar: jest.fn(),
  }),
}));

type DeliveredFileFixture = {
  toolCallId: string;
  filename: string;
  mimeType: string;
};

const buildDeliverFileToolPart = ({
  toolCallId,
  filename,
  mimeType,
}: DeliveredFileFixture) =>
  ({
    type: 'tool-deliver_file',
    toolCallId,
    state: 'output-available',
    input: { fileId: `file-${toolCallId}` },
    output: {
      fileId: `file-${toolCallId}`,
      filename,
      url: `https://example.com/${filename}`,
      mimeType,
      sizeBytes: 839,
    },
  }) as ToolUIPart;

const HELLO_WORLD_PDF: DeliveredFileFixture = {
  toolCallId: 'call-1',
  filename: 'Hello-World.pdf',
  mimeType: 'application/pdf',
};

const ChatFilesHarness = ({ children }: { children: ReactNode }) => {
  const { registerChatFile } = useRegisterAiChatFile();
  const { openChatFilesPanel } = useAiChatFilesPanel();

  const aiChatFilesContextValue = useMemo(
    () => ({ registerChatFile, openChatFilePreview: openChatFilesPanel }),
    [registerChatFile, openChatFilesPanel],
  );

  return (
    <AiChatFilesContext.Provider value={aiChatFilesContextValue}>
      {children}
    </AiChatFilesContext.Provider>
  );
};

const renderChat = ({
  files,
  isStreaming = false,
  withFilesContext = true,
}: {
  files: DeliveredFileFixture[];
  isStreaming?: boolean;
  withFilesContext?: boolean;
}) => {
  const chat = (
    <>
      <AiChatFilesButton />
      {files.map((file) => (
        <ToolStepRenderer
          key={file.toolCallId}
          toolPart={buildDeliverFileToolPart(file)}
          isStreaming={isStreaming}
          messageCreatedAt="2026-09-27T02:46:00.000Z"
        />
      ))}
      <AiChatFilesPanel />
    </>
  );

  return render(
    <JotaiProvider store={jotaiStore}>
      <I18nProvider i18n={i18n}>
        <ThemeProvider colorScheme="light">
          {withFilesContext ? (
            <ChatFilesHarness>{chat}</ChatFilesHarness>
          ) : (
            chat
          )}
        </ThemeProvider>
      </I18nProvider>
    </JotaiProvider>,
  );
};

describe('AiChatFilesPanel', () => {
  beforeEach(() => {
    i18n.load('en', {});
    i18n.activate('en');
    jest.clearAllMocks();
    resetJotaiStore();
    mockIsMobile = false;
  });

  it('lists delivered files and previews the selected one', async () => {
    const user = userEvent.setup();

    renderChat({ files: [HELLO_WORLD_PDF] });

    expect(screen.queryByRole('complementary')).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Files (1)' }));

    const panel = screen.getByRole('complementary');

    expect(within(panel).getByText('Chat files')).toBeVisible();

    await user.click(
      within(panel).getByRole('button', { name: /Hello-World\.pdf/ }),
    );

    expect(within(panel).getByTitle('Hello-World.pdf').tagName).toBe('IFRAME');

    await user.click(within(panel).getByRole('button', { name: 'Download' }));

    expect(downloadFile).toHaveBeenCalledWith(
      'https://example.com/Hello-World.pdf',
      'Hello-World.pdf',
    );

    await user.click(
      within(panel).getByRole('button', { name: 'Back to files' }),
    );

    expect(within(panel).getByText('Chat files')).toBeVisible();

    await user.click(
      within(panel).getByRole('button', { name: 'Close files' }),
    );

    expect(screen.queryByRole('complementary')).toBeNull();
  });

  it('opens the preview for a file delivered while the message streams', () => {
    renderChat({ files: [HELLO_WORLD_PDF], isStreaming: true });

    expect(
      within(screen.getByRole('complementary')).getByTitle('Hello-World.pdf'),
    ).toBeVisible();
  });

  it('opens the preview from the delivered file card', async () => {
    const user = userEvent.setup();

    renderChat({ files: [HELLO_WORLD_PDF] });

    await user.click(
      screen.getByRole('button', { name: 'Preview Hello-World.pdf' }),
    );

    expect(
      within(screen.getByRole('complementary')).getByTitle('Hello-World.pdf'),
    ).toBeVisible();
  });

  it('opens image cards in the full screen overlay instead of the panel', async () => {
    const user = userEvent.setup();

    renderChat({
      files: [
        {
          toolCallId: 'call-3',
          filename: 'Logo.png',
          mimeType: 'image/png',
        },
      ],
    });

    await user.click(screen.getByRole('button', { name: 'View image' }));

    expect(screen.getByRole('dialog', { name: 'Image' })).toBeVisible();
    expect(screen.queryByRole('complementary')).toBeNull();
  });

  it('explains that other file types cannot be previewed yet', async () => {
    const user = userEvent.setup();

    renderChat({
      files: [
        {
          toolCallId: 'call-2',
          filename: 'Proposal.docx',
          mimeType:
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        },
      ],
    });

    await user.click(
      screen.getByRole('button', { name: 'Preview Proposal.docx' }),
    );

    expect(
      screen.getByText('Previews for .docx are not yet supported'),
    ).toBeVisible();
  });

  it('explains when the browser cannot embed PDFs', async () => {
    const user = userEvent.setup();

    Object.defineProperty(navigator, 'pdfViewerEnabled', {
      value: false,
      configurable: true,
    });

    try {
      renderChat({ files: [HELLO_WORLD_PDF] });

      await user.click(
        screen.getByRole('button', { name: 'Preview Hello-World.pdf' }),
      );

      expect(
        screen.getByText(
          "Your browser doesn't support previews for this file type",
        ),
      ).toBeVisible();
    } finally {
      Reflect.deleteProperty(navigator, 'pdfViewerEnabled');
    }
  });

  it('opens as a bottom sheet on small screens', async () => {
    const user = userEvent.setup();
    mockIsMobile = true;

    renderChat({ files: [HELLO_WORLD_PDF] });

    await user.click(screen.getByRole('button', { name: 'Files (1)' }));

    expect(screen.getByRole('dialog', { name: 'Files' })).toBeVisible();
    expect(screen.queryByRole('complementary')).toBeNull();
  });

  it('stays hidden when the chat is not the full page', () => {
    renderChat({ files: [HELLO_WORLD_PDF], withFilesContext: false });

    expect(screen.queryByRole('button', { name: /^Files/ })).toBeNull();
    expect(screen.queryByRole('complementary')).toBeNull();
  });
});
