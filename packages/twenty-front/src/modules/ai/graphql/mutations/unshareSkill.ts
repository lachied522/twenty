import { gql } from '@apollo/client';

export const UNSHARE_SKILL = gql`
  mutation UnshareSkill($input: UnshareSkillInput!) {
    unshareSkill(input: $input)
  }
`;
