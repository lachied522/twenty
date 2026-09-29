import { getActiveAiChatNavigationThreadId } from '@/ai/utils/getActiveAiChatNavigationThreadId';

const THREAD_ID = '20202020-0000-4000-8000-000000000001';

describe('getActiveAiChatNavigationThreadId', () => {
  it('should highlight the current conversation on the chat page', () => {
    expect(
      getActiveAiChatNavigationThreadId({
        currentAiChatThread: THREAD_ID,
        pathname: `/chat/${THREAD_ID}`,
      }),
    ).toBe(THREAD_ID);
  });

  it('should highlight the current conversation on a new chat page', () => {
    expect(
      getActiveAiChatNavigationThreadId({
        currentAiChatThread: THREAD_ID,
        pathname: '/chat',
      }),
    ).toBe(THREAD_ID);
  });

  it.each(['/workflows', '/skills', '/integrations'])(
    'should not highlight a conversation on %s',
    (pathname) => {
      expect(
        getActiveAiChatNavigationThreadId({
          currentAiChatThread: THREAD_ID,
          pathname,
        }),
      ).toBeNull();
    },
  );
});
