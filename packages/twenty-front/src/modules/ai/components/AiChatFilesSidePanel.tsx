import { styled } from '@linaria/react';
import { type ReactNode, useCallback, useState } from 'react';
import { isDefined } from 'twenty-shared/utils';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { AI_CHAT_FILES_PANEL_WIDTH_VAR } from '@/ai/constants/AiChatFilesPanelWidthVar';
import { AI_CHAT_FILES_PANEL_WIDTHS } from '@/ai/constants/AiChatFilesPanelWidths';
import { ResizablePanelEdge } from '@/ui/layout/resizable-panel/components/ResizablePanelEdge';

// The CSS max-width keeps the chat above its minimum when the window shrinks
// after a drag; the drag constraints only apply while resizing
const StyledSidePanel = styled.aside`
  background: ${themeCssVariables.background.primary};
  border-left: 1px solid ${themeCssVariables.border.color.medium};
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  max-width: calc(100% - ${AI_CHAT_FILES_PANEL_WIDTHS.chatMin}px);
  min-width: ${AI_CHAT_FILES_PANEL_WIDTHS.panelMin}px;
  position: relative;
  width: var(
    ${AI_CHAT_FILES_PANEL_WIDTH_VAR},
    ${AI_CHAT_FILES_PANEL_WIDTHS.panelDefault}px
  );

  /* Iframes swallow pointer events, which would stall a drag over a PDF */
  &[data-resizing='true'] iframe {
    pointer-events: none;
  }
`;

type AiChatFilesSidePanelProps = {
  children: ReactNode;
};

export const AiChatFilesSidePanel = ({
  children,
}: AiChatFilesSidePanelProps) => {
  const [panelWidth, setPanelWidth] = useState<number>(
    AI_CHAT_FILES_PANEL_WIDTHS.panelDefault,
  );
  const [containerWidth, setContainerWidth] = useState<number | null>(null);
  const [isResizing, setIsResizing] = useState(false);

  const handleSidePanelRef = useCallback((element: HTMLElement | null) => {
    const container = element?.parentElement;

    if (!isDefined(container)) {
      return;
    }

    setContainerWidth(container.clientWidth);

    const resizeObserver = new ResizeObserver(([entry]) => {
      setContainerWidth(entry.contentRect.width);
    });

    resizeObserver.observe(container);

    // Width resets on every open, so drop the dragged value on close
    return () => {
      resizeObserver.disconnect();
      document.documentElement.style.removeProperty(
        AI_CHAT_FILES_PANEL_WIDTH_VAR,
      );
    };
  }, []);

  const maxPanelWidth = isDefined(containerWidth)
    ? Math.max(
        AI_CHAT_FILES_PANEL_WIDTHS.panelMin,
        containerWidth - AI_CHAT_FILES_PANEL_WIDTHS.chatMin,
      )
    : AI_CHAT_FILES_PANEL_WIDTHS.panelDefault;

  const handleWidthChange = useCallback((width: number) => {
    setPanelWidth(width);
    setIsResizing(false);
  }, []);

  const handleResizeStart = useCallback(() => {
    setIsResizing(true);
  }, []);

  // A click on the edge without dragging shouldn't close the panel
  const handleEdgeClick = useCallback(() => {
    setIsResizing(false);
  }, []);

  return (
    <StyledSidePanel ref={handleSidePanelRef} data-resizing={isResizing}>
      {children}
      <ResizablePanelEdge
        side="left"
        constraints={{
          min: AI_CHAT_FILES_PANEL_WIDTHS.panelMin,
          max: maxPanelWidth,
          default: AI_CHAT_FILES_PANEL_WIDTHS.panelDefault,
        }}
        currentWidth={Math.min(panelWidth, maxPanelWidth)}
        onWidthChange={handleWidthChange}
        onCollapse={handleEdgeClick}
        cssVariableName={AI_CHAT_FILES_PANEL_WIDTH_VAR}
        onResizeStart={handleResizeStart}
      />
    </StyledSidePanel>
  );
};
