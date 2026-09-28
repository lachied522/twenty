import { useMutation } from '@apollo/client/react';
import { useStore } from 'jotai';

import { isCreatingChatThreadState } from '@/ai/states/isCreatingChatThreadState';
import { skipMessagesSkeletonUntilLoadedState } from '@/ai/states/skipMessagesSkeletonUntilLoadedState';
import { threadIdCreatedFromDraftState } from '@/ai/states/threadIdCreatedFromDraftState';
import { useUpdateMetadataStoreDraft } from '@/metadata-store/hooks/useUpdateMetadataStoreDraft';
import { type FlatAgentChatThread } from '@/metadata-store/types/FlatAgentChatThread';
import { useSetAtomState } from '@/ui/utilities/state/jotai/hooks/useSetAtomState';
import { CreateChatThreadDocument } from '~/generated-metadata/graphql';

export const useCreateAgentChatThread = () => {
  const setIsCreatingChatThread = useSetAtomState(isCreatingChatThreadState);
  const store = useStore();
  const { addToDraft, applyChanges } = useUpdateMetadataStoreDraft();

  const [createChatThread] = useMutation(CreateChatThreadDocument, {
    onCompleted: (data) => {
      const newThread: FlatAgentChatThread = {
        id: data.createChatThread.id,
        title: data.createChatThread.title ?? null,
        createdAt: data.createChatThread.createdAt,
        updatedAt: data.createChatThread.updatedAt,
        conversationSize: 0,
        contextWindowTokens: null,
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalInputCredits: 0,
        totalOutputCredits: 0,
      };

      addToDraft({ key: 'agentChatThreads', items: [newThread] });
      applyChanges();

      // The URL is updated by the send that awaited this create. Trust the id
      // until a thread-list refresh actually returns it.
      store.set(threadIdCreatedFromDraftState.atom, data.createChatThread.id);
      store.set(skipMessagesSkeletonUntilLoadedState.atom, true);
      setIsCreatingChatThread(false);
    },
    onError: () => {
      setIsCreatingChatThread(false);
    },
  });

  return { createChatThread };
};
