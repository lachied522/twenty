import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { useLocation } from 'react-router-dom';
import { AppPath } from 'twenty-shared/types';
import {
  IconBook,
  IconPlug,
  IconPlus,
  IconSettingsAutomation,
} from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { AiChatThreadDeleteConfirmationModal } from '@/ai/components/AiChatThreadDeleteConfirmationModal';
import { AiChatThreadFilterDropdown } from '@/ai/components/AiChatThreadFilterDropdown';
import { AiChatSkeletonLoader } from '@/ai/components/internal/AiChatSkeletonLoader';
import { NavigationDrawerAiChatThreadSection } from '@/ai/components/NavigationDrawerAiChatThreadSection';
import { AGENT_CHAT_THREAD_GROUP_BY } from '@/ai/constants/AgentChatThreadGroupBy';
import { AI_CHAT_THREAD_ACTIONS_SURFACE } from '@/ai/constants/AiChatThreadActionsSurface';
import { useAiChatThreadClick } from '@/ai/hooks/useAiChatThreadClick';
import { useChatThreads } from '@/ai/hooks/useChatThreads';
import { useSwitchToNewAiChat } from '@/ai/hooks/useSwitchToNewAiChat';
import { agentChatThreadGroupByState } from '@/ai/states/agentChatThreadGroupByState';
import { currentAiChatThreadState } from '@/ai/states/currentAiChatThreadState';
import { groupThreadsByDate } from '@/ai/utils/groupThreadsByDate';
import { isComposioEnabledState } from '@/client-config/states/isComposioEnabledState';
import { NavigationDrawerItem } from '@/ui/navigation/navigation-drawer/components/NavigationDrawerItem';
import { NavigationDrawerSection } from '@/ui/navigation/navigation-drawer/components/NavigationDrawerSection';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { isMatchingLocation } from '~/utils/isMatchingLocation';
import { isWorkflowRelatedPath } from '~/utils/isWorkflowRelatedPath';

const StyledContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
`;

const StyledThreadList = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  margin-top: ${themeCssVariables.spacing[3]};
  min-height: 0;
  width: 100%;
`;

const StyledSectionsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[3]};
`;

const StyledEmptyState = styled.div`
  align-items: center;
  color: ${themeCssVariables.font.color.light};
  display: flex;
  flex: 1;
  font-size: ${themeCssVariables.font.size.md};
  justify-content: center;
`;

const StyledFetchMoreTrigger = styled.div`
  height: 1px;
  min-height: 1px;
  width: 100%;
`;

const AI_CHAT_RECENTS_NAVIGATION_SECTION_ID = 'AiChatRecents';

export const NavigationDrawerAiChatContent = () => {
  const { t } = useLingui();
  const location = useLocation();
  const isComposioEnabled = useAtomStateValue(isComposioEnabledState);

  const currentAiChatThread = useAtomStateValue(currentAiChatThreadState);
  const { handleThreadClick } = useAiChatThreadClick({
    resetNavigationStack: true,
  });
  const agentChatThreadGroupBy = useAtomStateValue(agentChatThreadGroupByState);

  const { threads, hasNextPage, loading, fetchMoreRef } = useChatThreads();
  const { switchToNewChat } = useSwitchToNewAiChat({
    shouldOpenInFullPage: true,
  });

  if (loading && threads.length === 0) {
    return (
      <StyledContainer>
        <AiChatSkeletonLoader />
      </StyledContainer>
    );
  }

  const isGroupedByDate =
    agentChatThreadGroupBy === AGENT_CHAT_THREAD_GROUP_BY.DATE;
  const dateGroups = isGroupedByDate ? groupThreadsByDate(threads) : [];
  const shouldRenderDateGroups = isGroupedByDate && dateGroups.length > 0;

  const filterDropdown = (
    <AiChatThreadFilterDropdown
      surface={AI_CHAT_THREAD_ACTIONS_SURFACE.NAV_DRAWER}
    />
  );

  return (
    <StyledContainer>
      <NavigationDrawerSection>
        <NavigationDrawerItem
          label={t`New chat`}
          Icon={IconPlus}
          onClick={switchToNewChat}
        />
        <NavigationDrawerItem
          label={t`Skills`}
          Icon={IconBook}
          to={AppPath.Skills}
          active={isMatchingLocation(location, AppPath.Skills)}
        />
        {isComposioEnabled ? (
          <NavigationDrawerItem
            label={t`Integrations`}
            Icon={IconPlug}
            to={AppPath.Integrations}
            active={isMatchingLocation(location, AppPath.Integrations)}
          />
        ) : null}
        <NavigationDrawerItem
          label={t`Workflows`}
          Icon={IconSettingsAutomation}
          to={AppPath.Workflows}
          active={isWorkflowRelatedPath(location.pathname)}
        />
      </NavigationDrawerSection>
      <StyledThreadList>
        {shouldRenderDateGroups ? (
          <StyledSectionsContainer>
            {dateGroups.map((dateGroup, index) => (
              <NavigationDrawerAiChatThreadSection
                key={dateGroup.id}
                sectionId={`AiChatDateGroup:${dateGroup.id}`}
                title={dateGroup.title}
                threads={dateGroup.threads}
                currentThreadId={currentAiChatThread}
                onThreadClick={handleThreadClick}
                rightIcon={index === 0 ? filterDropdown : undefined}
              />
            ))}
          </StyledSectionsContainer>
        ) : (
          <NavigationDrawerAiChatThreadSection
            sectionId={AI_CHAT_RECENTS_NAVIGATION_SECTION_ID}
            title={t`Recents`}
            threads={threads}
            currentThreadId={currentAiChatThread}
            onThreadClick={handleThreadClick}
            rightIcon={filterDropdown}
          />
        )}
        {threads.length === 0 ? (
          <StyledEmptyState>{t`No chat`}</StyledEmptyState>
        ) : null}
        {hasNextPage ? <StyledFetchMoreTrigger ref={fetchMoreRef} /> : null}
      </StyledThreadList>
      <AiChatThreadDeleteConfirmationModal
        surface={AI_CHAT_THREAD_ACTIONS_SURFACE.NAV_DRAWER}
      />
    </StyledContainer>
  );
};
