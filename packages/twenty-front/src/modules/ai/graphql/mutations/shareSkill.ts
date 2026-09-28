import { gql } from '@apollo/client';

export const SHARE_SKILL = gql`
  mutation ShareSkill($input: ShareSkillInput!) {
    shareSkill(input: $input) {
      id
      skillId
      principalType
      principalId
      accessLevel
      createdAt
      updatedAt
    }
  }
`;
