import { useStore } from 'jotai';
import { useCallback } from 'react';
import { isDefined } from 'twenty-shared/utils';

import { AGENT_CHAT_NEW_THREAD_DRAFT_KEY } from '@/ai/states/agentChatDraftsByThreadIdState';
import { currentAiChatThreadState } from '@/ai/states/currentAiChatThreadState';
import { isCreatingChatThreadState } from '@/ai/states/isCreatingChatThreadState';
import { pendingCreateFromDraftPromiseState } from '@/ai/states/pendingCreateFromDraftPromiseState';
import { useSetAtomState } from '@/ui/utilities/state/jotai/hooks/useSetAtomState';

export const useEnsureAgentChatThreadIdForSend = (
  createChatThread: () => Promise<any>,
) => {
  const setIsCreatingChatThread = useSetAtomState(isCreatingChatThreadState);
  const store = useStore();

  const ensureThreadIdForSend = useCallback(async (): Promise<
    string | null
  > => {
    const currentThreadId = store.get(currentAiChatThreadState.atom);

    if (
      currentThreadId !== null &&
      currentThreadId !== AGENT_CHAT_NEW_THREAD_DRAFT_KEY
    ) {
      return currentThreadId;
    }

    const inFlightCreatePromise = store.get(
      pendingCreateFromDraftPromiseState.atom,
    );

    if (
      store.get(isCreatingChatThreadState.atom) &&
      isDefined(inFlightCreatePromise)
    ) {
      try {
        const threadId = await inFlightCreatePromise;
        return threadId;
      } catch {
        return null;
      }
    }

    setIsCreatingChatThread(true);

    const threadIdPromise = createChatThread().then(
      (result) => result?.data?.createChatThread?.id ?? null,
    );

    store.set(pendingCreateFromDraftPromiseState.atom, threadIdPromise);

    try {
      return await threadIdPromise;
    } catch {
      return null;
    } finally {
      store.set(pendingCreateFromDraftPromiseState.atom, null);
      setIsCreatingChatThread(false);
    }
  }, [createChatThread, store, setIsCreatingChatThread]);

  return { ensureThreadIdForSend };
};
