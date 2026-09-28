import { type DriveItem } from '@/drive/types/Drive';
import { styled } from '@linaria/react';
import { t } from '@lingui/core/macro';
import { IconFile, IconFolder, IconShare, IconTrash } from 'twenty-ui/icon';
import { Button } from 'twenty-ui/input';
import { OverflowingTextWithTooltip } from 'twenty-ui/surfaces';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledItemRow = styled.div`
  align-items: center;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};
  width: 100%;

  &:hover {
    background: ${themeCssVariables.background.transparent.lighter};
  }
`;

const StyledItemButton = styled.button`
  align-items: center;
  background: transparent;
  border: none;
  color: ${themeCssVariables.font.color.primary};
  cursor: pointer;
  display: flex;
  flex: 1;
  font-family: inherit;
  font-size: inherit;
  gap: ${themeCssVariables.spacing[2]};
  min-width: 0;
  padding: ${themeCssVariables.spacing[1]} 0;
  text-align: left;
`;

const StyledItemActions = styled.div`
  align-items: center;
  display: flex;
  flex-shrink: 0;
  gap: ${themeCssVariables.spacing[1]};
  margin-left: auto;
`;

const StyledItemName = styled.span`
  min-width: 0;
  overflow: hidden;
`;

type DriveItemRowProps = {
  item: DriveItem;
  canWrite: boolean;
  canShare: boolean;
  onOpen: (item: DriveItem) => void;
  onRename: (item: DriveItem) => void;
  onDelete: (item: DriveItem) => void;
  onShare: (item: DriveItem) => void;
};

export const DriveItemRow = ({
  item,
  canWrite,
  canShare,
  onOpen,
  onRename,
  onDelete,
  onShare,
}: DriveItemRowProps) => {
  const ItemIcon = item.kind === 'FOLDER' ? IconFolder : IconFile;

  return (
    <StyledItemRow>
      <StyledItemButton
        type="button"
        onClick={() => onOpen(item)}
        onDoubleClick={() => onRename(item)}
      >
        <ItemIcon size={16} />
        <StyledItemName>
          <OverflowingTextWithTooltip text={item.name} />
        </StyledItemName>
      </StyledItemButton>
      {(canWrite || canShare) && (
        <StyledItemActions>
          {canWrite && (
            <Button
              Icon={IconTrash}
              title={t`Delete`}
              variant="tertiary"
              onClick={() => onDelete(item)}
            />
          )}
          {canShare && (
            <Button
              Icon={IconShare}
              title={t`Share`}
              variant="tertiary"
              onClick={() => onShare(item)}
            />
          )}
        </StyledItemActions>
      )}
    </StyledItemRow>
  );
};
