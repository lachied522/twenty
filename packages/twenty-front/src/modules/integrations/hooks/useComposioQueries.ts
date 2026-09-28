import {
  type ComposioAccount,
  type ComposioConnectResult,
  type ComposioToolkitCategory,
  type ComposioToolkitDetail,
  type ComposioToolkitSummary,
} from '@/integrations/types/Composio';
import {
  ComposioToolkitCategoriesDocument,
  ComposioToolkitDocument,
  ComposioToolkitsDocument,
  ConnectComposioToolkitDocument,
  DeleteComposioAccountDocument,
  RefreshComposioAccountDocument,
  UpdateComposioAccountAliasDocument,
  WaitForComposioAccountDocument,
} from '~/generated-metadata/graphql';
import { useMutation, useQuery } from '@apollo/client/react';
import { isNonEmptyString } from '@sniptt/guards';
import { useCallback } from 'react';
import { isDefined } from 'twenty-shared/utils';

export const useComposioToolkitCategories = () => {
  const { data, loading } = useQuery(ComposioToolkitCategoriesDocument);

  return {
    totalCount: data?.composioToolkitCategories.totalCount ?? 0,
    categories: (data?.composioToolkitCategories.categories ??
      []) as ComposioToolkitCategory[],
    loading,
  };
};

export const useComposioToolkits = (
  search: string,
  options?: {
    requireMinSearchLength?: boolean;
    categoryId?: string | null;
  },
) => {
  const trimmedSearch = search.trim();
  const searchVariable = trimmedSearch.length >= 3 ? trimmedSearch : undefined;
  const categoryVariable = isNonEmptyString(options?.categoryId)
    ? options.categoryId.trim()
    : undefined;
  const skip =
    options?.requireMinSearchLength === true && trimmedSearch.length < 3;

  const { data, loading, refetch, fetchMore } = useQuery(
    ComposioToolkitsDocument,
    {
      variables: { search: searchVariable, category: categoryVariable },
      skip,
    },
  );

  const loadMore = useCallback(async () => {
    const nextCursor = data?.composioToolkits.nextCursor;

    if (!isDefined(nextCursor)) {
      return;
    }

    await fetchMore({
      variables: {
        search: searchVariable,
        category: categoryVariable,
        cursor: nextCursor,
      },
      updateQuery: (previous, { fetchMoreResult }) => {
        if (!isDefined(fetchMoreResult)) {
          return previous;
        }

        return {
          composioToolkits: {
            ...previous.composioToolkits,
            items: [
              ...previous.composioToolkits.items,
              ...fetchMoreResult.composioToolkits.items,
            ],
            nextCursor: fetchMoreResult.composioToolkits.nextCursor,
          },
        };
      },
    });
  }, [
    categoryVariable,
    data?.composioToolkits.nextCursor,
    fetchMore,
    searchVariable,
  ]);

  return {
    items: (data?.composioToolkits.items ?? []) as ComposioToolkitSummary[],
    nextCursor: data?.composioToolkits.nextCursor ?? null,
    loading,
    refetch,
    loadMore,
  };
};

export const useComposioToolkitDetail = (toolkitSlug: string | null) => {
  const { data, loading, refetch } = useQuery(ComposioToolkitDocument, {
    variables: { toolkitSlug: toolkitSlug ?? '' },
    skip: !toolkitSlug,
  });

  return {
    detail: (data?.composioToolkit ?? null) as ComposioToolkitDetail | null,
    loading,
    refetch,
  };
};

export const useComposioActions = () => {
  const [connectComposioToolkit] = useMutation(ConnectComposioToolkitDocument);
  const [waitForComposioAccount] = useMutation(WaitForComposioAccountDocument);
  const [refreshComposioAccount] = useMutation(RefreshComposioAccountDocument);
  const [deleteComposioAccount] = useMutation(DeleteComposioAccountDocument);
  const [updateComposioAccountAlias] = useMutation(
    UpdateComposioAccountAliasDocument,
  );

  const connect = async (input: {
    toolkitSlug: string;
    callbackUrl: string;
    alias?: string;
    credentials?: Record<string, string>;
  }): Promise<ComposioConnectResult> => {
    const result = await connectComposioToolkit({ variables: { input } });

    return result.data?.connectComposioToolkit as ComposioConnectResult;
  };

  const waitForAccount = async (
    accountId: string,
  ): Promise<ComposioAccount> => {
    const result = await waitForComposioAccount({
      variables: { accountId },
    });

    return result.data?.waitForComposioAccount as ComposioAccount;
  };

  const refresh = async (input: { accountId: string; redirectUrl: string }) => {
    const result = await refreshComposioAccount({ variables: { input } });

    return result.data?.refreshComposioAccount as {
      redirectUrl: string | null;
      connectedAccountId: string;
    };
  };

  const remove = async (accountId: string) => {
    await deleteComposioAccount({ variables: { accountId } });
  };

  const rename = async (accountId: string, alias: string) => {
    await updateComposioAccountAlias({
      variables: { input: { accountId, alias } },
    });
  };

  return { connect, waitForAccount, refresh, remove, rename };
};
