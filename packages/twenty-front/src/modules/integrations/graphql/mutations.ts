import { gql } from '@apollo/client';

export const CONNECT_COMPOSIO_TOOLKIT = gql`
  mutation ConnectComposioToolkit($input: ConnectComposioToolkitInput!) {
    connectComposioToolkit(input: $input) {
      redirectUrl
      connectedAccountId
      account {
        id
        alias
        status
        rawStatus
        createdAt
        updatedAt
      }
    }
  }
`;

export const WAIT_FOR_COMPOSIO_ACCOUNT = gql`
  mutation WaitForComposioAccount($accountId: String!) {
    waitForComposioAccount(accountId: $accountId) {
      id
      alias
      status
      rawStatus
      createdAt
      updatedAt
    }
  }
`;

export const REFRESH_COMPOSIO_ACCOUNT = gql`
  mutation RefreshComposioAccount($input: RefreshComposioAccountInput!) {
    refreshComposioAccount(input: $input) {
      redirectUrl
      connectedAccountId
    }
  }
`;

export const DELETE_COMPOSIO_ACCOUNT = gql`
  mutation DeleteComposioAccount($accountId: String!) {
    deleteComposioAccount(accountId: $accountId)
  }
`;

export const UPDATE_COMPOSIO_ACCOUNT_ALIAS = gql`
  mutation UpdateComposioAccountAlias(
    $input: UpdateComposioAccountAliasInput!
  ) {
    updateComposioAccountAlias(input: $input) {
      id
      alias
    }
  }
`;
