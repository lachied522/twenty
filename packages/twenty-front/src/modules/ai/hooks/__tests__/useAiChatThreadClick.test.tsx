import { act, renderHook } from '@testing-library/react';
import { Provider as JotaiProvider } from 'jotai';
import { type ReactNode } from 'react';

import { AgentChatComponentInstanceContext } from '@/ai/contexts/AgentChatComponentInstanceContext';
import { useAiChatThreadClick } from '@/ai/hooks/useAiChatThreadClick';
import { jotaiStore } from '@/ui/utilities/state/jotai/jotaiStore';
import { type AgentChatThread } from '~/generated-metadata/graphql';

const selectAiChatThreadMock = jest.fn();
const openAskAiPageMock = jest.fn();
const navigateToAiChatPageMock = jest.fn();

jest.mock('@/ai/hooks/useSelectAiChatThread', () => ({
  useSelectAiChatThread: () => ({
    selectAiChatThread: selectAiChatThreadMock,
  }),
}));

jest.mock('@/side-panel/hooks/useOpenAskAiPageInSidePanel', () => ({
  useOpenAskAiPageInSidePanel: () => ({
    openAskAiPage: openAskAiPageMock,
  }),
}));

jest.mock('@/ai/hooks/useNavigateToAiChatPage', () => ({
  useNavigateToAiChatPage: () => ({
    navigateToAiChatPage: navigateToAiChatPageMock,
  }),
}));

const INSTANCE_ID = 'aiChatThreadClickTest';
const THREAD_ID = '20202020-0000-4000-8000-000000000001';

const buildThread = (
  overrides: Partial<AgentChatThread> = {},
): AgentChatThread =>
  ({
    id: THREAD_ID,
    title: 'Can you generate images?',
    createdAt: '2026-04-01T00:00:00.000Z',
    updatedAt: '2026-04-01T00:00:00.000Z',
    totalInputTokens: 0,
    totalOutputTokens: 0,
    contextWindowTokens: null,
    conversationSize: 0,
    totalInputCredits: 0,
    totalOutputCredits: 0,
    ...overrides,
  }) as AgentChatThread;

const Wrapper = ({ children }: { children: ReactNode }) => (
  <JotaiProvider store={jotaiStore}>
    <AgentChatComponentInstanceContext.Provider
      value={{ instanceId: INSTANCE_ID }}
    >
      {children}
    </AgentChatComponentInstanceContext.Provider>
  </JotaiProvider>
);

describe('useAiChatThreadClick', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.history.pushState({}, '', '/workflows');
  });

  it('should open a conversation from another page in the side panel by default', () => {
    const { result } = renderHook(() => useAiChatThreadClick(), {
      wrapper: Wrapper,
    });

    act(() => {
      result.current.handleThreadClick(buildThread());
    });

    expect(selectAiChatThreadMock).toHaveBeenCalledWith(THREAD_ID);
    expect(openAskAiPageMock).toHaveBeenCalledWith({
      resetNavigationStack: false,
    });
    expect(navigateToAiChatPageMock).not.toHaveBeenCalled();
  });

  it('should navigate to the chat page when asked to open in full page', () => {
    const { result } = renderHook(
      () =>
        useAiChatThreadClick({
          resetNavigationStack: true,
          shouldOpenInFullPage: true,
        }),
      { wrapper: Wrapper },
    );

    act(() => {
      result.current.handleThreadClick(buildThread());
    });

    expect(selectAiChatThreadMock).toHaveBeenCalledWith(THREAD_ID);
    expect(navigateToAiChatPageMock).toHaveBeenCalledWith({
      threadId: THREAD_ID,
    });
    expect(openAskAiPageMock).not.toHaveBeenCalled();
  });

  it('should stay on the chat page when already there', () => {
    window.history.pushState({}, '', `/chat/${THREAD_ID}`);

    const { result } = renderHook(
      () =>
        useAiChatThreadClick({
          shouldOpenInFullPage: true,
        }),
      { wrapper: Wrapper },
    );

    act(() => {
      result.current.handleThreadClick(buildThread());
    });

    expect(selectAiChatThreadMock).toHaveBeenCalledWith(THREAD_ID);
    expect(navigateToAiChatPageMock).not.toHaveBeenCalled();
    expect(openAskAiPageMock).not.toHaveBeenCalled();
  });
});
