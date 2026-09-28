import { gql } from '@apollo/client';

export const FIND_SKILL_SHARES = gql`
  query SkillShares($skillId: UUID!) {
    skillShares(skillId: $skillId) {
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
