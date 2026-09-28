import { gql } from '@apollo/client';

export const COMPOSIO_TOOLKIT_CATEGORIES = gql`
  query ComposioToolkitCategories {
    composioToolkitCategories {
      totalCount
      categories {
        id
        name
        toolkitCount
      }
    }
  }
`;

export const COMPOSIO_TOOLKITS = gql`
  query ComposioToolkits($search: String, $cursor: String, $category: String) {
    composioToolkits(search: $search, cursor: $cursor, category: $category) {
      items {
        slug
        name
        description
        logo
        noAuth
        status
        accountCount
      }
      nextCursor
    }
  }
`;

export const COMPOSIO_TOOLKIT = gql`
  query ComposioToolkit($toolkitSlug: String!) {
    composioToolkit(toolkitSlug: $toolkitSlug) {
      slug
      name
      description
      logo
      noAuth
      status
      authConfigId
      connectMode
      connectFields {
        name
        displayName
        description
        required
        type
      }
      configurationError
      accounts {
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
