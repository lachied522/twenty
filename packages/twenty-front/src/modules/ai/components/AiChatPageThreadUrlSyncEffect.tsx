import { useLayoutEffect } from 'react';
import { useParams } from 'react-router-dom';
import { isDefined, isValidUuid } from 'twenty-shared/utils';

import { useRefreshAgentChatThreads } from '@/ai/hooks/useRefreshAgentChatThreads';
import { useSwitchAgentChatThreadWithDraft } from '@/ai/hooks/useSwitchAgentChatThreadWithDraft';
import { useSwitchToNewAiChat } from '@/ai/hooks/useSwitchToNewAiChat';
import { currentAiChatThreadState } from '@/ai/states/currentAiChatThreadState';
import { threadIdCreatedFromDraftState } from '@/ai/states/threadIdCreatedFromDraftState';
import { currentAiChatThreadDataSelector } from '@/ai/states/selectors/currentAiChatThreadDataSelector';
import { metadataStoreState } from '@/metadata-store/states/metadataStoreState';
import { useAtomFamilyStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomFamilyStateValue';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';

export const AiChatPageThreadUrlSyncEffect = () => {
  const { threadId } = useParams();
  const currentAiChatThread = useAtomStateValue(currentAiChatThreadState);
  const threadIdCreatedFromDraft = useAtomStateValue(
    threadIdCreatedFromDraftState,
  );
  const currentAiChatThreadData = useAtomStateValue(
    currentAiChatThreadDataSelector,
  );
  const metadataStoreAgentChatThreads = useAtomFamilyStateValue(
    metadataStoreState,
    'agentChatThreads',
  );
  const { switchThreadWithDraft } = useSwitchAgentChatThreadWithDraft();
  const { refreshAgentChatThreads } = useRefreshAgentChatThreads();
  const { switchToNewChat } = useSwitchToNewAiChat({
    shouldOpenInFullPage: true,
  });

  useLayoutEffect(() => {
    if (!isDefined(threadId) || !isValidUuid(threadId)) {
      return;
    }

    if (threadId !== currentAiChatThread) {
      switchThreadWithDraft(threadId);
      return;
    }

    // A thread created in this session can be missing from the server list
    // until a later refresh includes it. Recovering here would replace the
    // conversation the user just started.
    if (threadId === threadIdCreatedFromDraft) {
      return;
    }

    if (
      metadataStoreAgentChatThreads.status === 'up-to-date' &&
      !isDefined(currentAiChatThreadData)
    ) {
      let isCurrentThread = true;

      void refreshAgentChatThreads().then((chatThreads) => {
        if (
          !isCurrentThread ||
          !isDefined(chatThreads) ||
          chatThreads.some((chatThread) => chatThread.id === threadId)
        ) {
          return;
        }

        switchToNewChat();
      });

      return () => {
        isCurrentThread = false;
      };
    }
  }, [
    threadId,
    currentAiChatThread,
    threadIdCreatedFromDraft,
    currentAiChatThreadData,
    metadataStoreAgentChatThreads.status,
    refreshAgentChatThreads,
    switchThreadWithDraft,
    switchToNewChat,
  ]);

  return null;
};
