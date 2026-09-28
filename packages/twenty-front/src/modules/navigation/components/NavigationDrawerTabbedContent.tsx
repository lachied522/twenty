import { NavigationDrawerAiChatContent } from '@/ai/components/NavigationDrawerAiChatContent';
import { styled } from '@linaria/react';
import { type ReactNode } from 'react';

type NavigationDrawerTabbedContentProps = {
  showAiChatContent: boolean;
  shouldMountAiChatContent: boolean;
  showFilesContent: boolean;
  filesContent: ReactNode;
  navigationContent: ReactNode;
};

const StyledTabContent = styled.div<{ isHidden: boolean }>`
  display: ${({ isHidden }) => (isHidden ? 'none' : 'contents')};
`;

export const NavigationDrawerTabbedContent = ({
  showAiChatContent,
  shouldMountAiChatContent,
  showFilesContent,
  filesContent,
  navigationContent,
}: NavigationDrawerTabbedContentProps) => {
  return (
    <>
      <StyledTabContent isHidden={showAiChatContent || showFilesContent}>
        {navigationContent}
      </StyledTabContent>
      {shouldMountAiChatContent && (
        <StyledTabContent isHidden={!showAiChatContent}>
          <NavigationDrawerAiChatContent />
        </StyledTabContent>
      )}
      <StyledTabContent isHidden={!showFilesContent}>
        {showFilesContent ? filesContent : null}
      </StyledTabContent>
    </>
  );
};
