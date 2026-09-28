import { useApolloClient } from '@apollo/client/react';
import { useStore } from 'jotai';
import { useCallback } from 'react';
import { isDefined } from 'twenty-shared/utils';

import { threadIdCreatedFromDraftState } from '@/ai/states/threadIdCreatedFromDraftState';
import { useUpdateMetadataStoreDraft } from '@/metadata-store/hooks/useUpdateMetadataStoreDraft';
import { metadataStoreState } from '@/metadata-store/states/metadataStoreState';
import { type FlatAgentChatThread } from '@/metadata-store/types/FlatAgentChatThread';
import { GetChatThreadsDocument } from '~/generated-metadata/graphql';

export const useRefreshAgentChatThreads = () => {
  const client = useApolloClient();
  const store = useStore();
  const { replaceDraft, applyChanges } = useUpdateMetadataStoreDraft();

  const refreshAgentChatThreads = useCallback(async () => {
    while (true) {
      const storeEntryBeforeRequest = store.get(
        metadataStoreState.atomFamily('agentChatThreads'),
      );
      const result = await client
        .query({
          query: GetChatThreadsDocument,
          fetchPolicy: 'network-only',
        })
        .catch(() => undefined);

      const agentChatThreads = result?.data?.chatThreads;

      if (!isDefined(agentChatThreads)) {
        return undefined;
      }

      // Retry with a fresh server snapshot when a local or subscription update
      // arrives during the request.
      if (
        store.get(metadataStoreState.atomFamily('agentChatThreads')) !==
        storeEntryBeforeRequest
      ) {
        continue;
      }

      const locallyCreatedThreadId = store.get(
        threadIdCreatedFromDraftState.atom,
      );
      let chatThreadsToStore = agentChatThreads;

      if (isDefined(locallyCreatedThreadId)) {
        const serverHasLocallyCreatedThread = agentChatThreads.some(
          (chatThread) => chatThread.id === locallyCreatedThreadId,
        );

        if (serverHasLocallyCreatedThread) {
          store.set(threadIdCreatedFromDraftState.atom, null);
        } else {
          const locallyCreatedThread = (
            storeEntryBeforeRequest.current as FlatAgentChatThread[]
          ).find((chatThread) => chatThread.id === locallyCreatedThreadId);

          // The snapshot can omit a thread created moments ago. Keep that one
          // local row until a later snapshot includes it.
          if (isDefined(locallyCreatedThread)) {
            chatThreadsToStore = [...agentChatThreads, locallyCreatedThread];
          }
        }
      }

      replaceDraft('agentChatThreads', chatThreadsToStore);
      applyChanges();

      return chatThreadsToStore;
    }
  }, [client, store, replaceDraft, applyChanges]);

  return { refreshAgentChatThreads };
};
