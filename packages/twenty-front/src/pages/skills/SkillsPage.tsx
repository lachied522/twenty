import { currentWorkspaceMemberState } from '@/auth/states/currentWorkspaceMemberState';
import { isComposioEnabledState } from '@/client-config/states/isComposioEnabledState';
import { SkillShareDialog } from '@/skills/components/SkillShareDialog';
import { SkillToolkitPicker } from '@/skills/components/SkillToolkitPicker';
import { TextArea } from '@/ui/input/components/TextArea';
import { TextInput } from '@/ui/input/components/TextInput';
import { PageCardHeader } from '@/ui/layout/page/components/PageCardHeader';
import { PageCardLayout } from '@/ui/layout/page/components/PageCardLayout';
import { PageTitle } from '@/ui/utilities/page-title/components/PageTitle';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useSnackBar } from '@/ui/feedback/snack-bar-manager/hooks/useSnackBar';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { useMutation, useQuery } from '@apollo/client/react';
import { useMemo, useState } from 'react';
import { isDefined } from 'twenty-shared/utils';
import { tipTapDocumentToMarkdown } from 'twenty-shared/utils';
import { IconBook, IconPlus, IconShare } from 'twenty-ui/icon';
import { Button, InputHint } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';
import {
  CreateSkillDocument,
  DeleteSkillDocument,
  FindManySkillsDocument,
  UpdateSkillDocument,
  type SkillFieldsFragment,
} from '~/generated-metadata/graphql';
import { computeMetadataNameFromLabel } from '~/pages/settings/data-model/utils/computeMetadataNameFromLabel';

const StyledLayout = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[4]};
  height: 100%;
  min-height: 0;
  padding: ${themeCssVariables.spacing[4]};
`;

const StyledSplit = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[4]};
  grid-template-columns: minmax(0, 1fr) minmax(320px, 1.2fr);
  min-height: 0;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const StyledList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
  min-height: 0;
  overflow: auto;
`;

const StyledSectionTitle = styled.div`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
  font-weight: ${themeCssVariables.font.weight.medium};
  padding: ${themeCssVariables.spacing[1]} 0;
`;

const StyledSkillButton = styled.button<{ $active: boolean }>`
  align-items: flex-start;
  background: ${({ $active }) =>
    $active
      ? themeCssVariables.background.transparent.light
      : themeCssVariables.background.secondary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.md};
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
  padding: ${themeCssVariables.spacing[3]};
  text-align: left;
  width: 100%;

  &:hover {
    background: ${themeCssVariables.background.transparent.light};
  }
`;

const StyledSkillLabel = styled.div`
  color: ${themeCssVariables.font.color.primary};
  font-weight: ${themeCssVariables.font.weight.medium};
`;

const StyledSkillDescription = styled.div`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
`;

const StyledDetail = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[3]};
  min-height: 0;
  overflow: auto;
`;

const StyledToolkitRow = styled.div`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.sm};
`;

const StyledFieldBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
`;

const StyledEmpty = styled.div`
  color: ${themeCssVariables.font.color.light};
  padding: ${themeCssVariables.spacing[4]};
  text-align: center;
`;

const StyledActions = styled.div`
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  flex-wrap: wrap;
`;

export const SkillsPage = () => {
  const { t } = useLingui();
  const { enqueueErrorSnackBar, enqueueSuccessSnackBar } = useSnackBar();
  const currentWorkspaceMember = useAtomStateValue(currentWorkspaceMemberState);
  const isComposioEnabled = useAtomStateValue(isComposioEnabledState);
  const { data, loading, refetch } = useQuery(FindManySkillsDocument);
  const [createSkill] = useMutation(CreateSkillDocument);
  const [updateSkill] = useMutation(UpdateSkillDocument);
  const [deleteSkill] = useMutation(DeleteSkillDocument);

  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [draftLabel, setDraftLabel] = useState('');
  const [draftDescription, setDraftDescription] = useState('');
  const [draftContent, setDraftContent] = useState('');
  const [draftToolkitSlugs, setDraftToolkitSlugs] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const skills = data?.skills ?? [];
  const currentUserWorkspaceId = currentWorkspaceMember?.userWorkspaceId;

  const { mine, sharedWithMe, workspaceSkills } = useMemo(() => {
    const mineSkills: SkillFieldsFragment[] = [];
    const sharedSkills: SkillFieldsFragment[] = [];
    const workspace: SkillFieldsFragment[] = [];

    for (const skill of skills) {
      if (skill.isHidden) {
        continue;
      }

      if (skill.kind === 'USER') {
        if (
          isDefined(currentUserWorkspaceId) &&
          skill.ownerUserWorkspaceId === currentUserWorkspaceId
        ) {
          mineSkills.push(skill);
        } else {
          sharedSkills.push(skill);
        }
      } else if (skill.kind === 'SYSTEM' || skill.kind === 'WORKSPACE') {
        workspace.push(skill);
      }
    }

    return {
      mine: mineSkills,
      sharedWithMe: sharedSkills,
      workspaceSkills: workspace,
    };
  }, [skills, currentUserWorkspaceId]);

  const selectedSkill =
    skills.find((skill) => skill.id === selectedSkillId) ?? null;

  const isOwner =
    isDefined(selectedSkill) &&
    selectedSkill.kind === 'USER' &&
    selectedSkill.ownerUserWorkspaceId === currentUserWorkspaceId;

  const loadSkillIntoDraft = (skill: SkillFieldsFragment) => {
    setIsCreating(false);
    setSelectedSkillId(skill.id);
    setDraftLabel(skill.label);
    setDraftDescription(skill.description ?? '');
    setDraftContent(tipTapDocumentToMarkdown(skill.content));
    setDraftToolkitSlugs(skill.toolkitSlugs ?? []);
  };

  const handleStartCreate = () => {
    setIsCreating(true);
    setSelectedSkillId(null);
    setDraftLabel('');
    setDraftDescription('');
    setDraftContent('');
    setDraftToolkitSlugs([]);
  };

  const handleSave = async () => {
    if (!draftLabel.trim() || !draftContent.trim()) {
      return;
    }

    setIsSaving(true);

    try {
      if (isCreating) {
        const result = await createSkill({
          variables: {
            input: {
              name: computeMetadataNameFromLabel(draftLabel),
              label: draftLabel.trim(),
              description: draftDescription.trim() || undefined,
              content: draftContent,
              icon: 'IconBook',
              ownerUserWorkspaceId: currentUserWorkspaceId ?? undefined,
              toolkitSlugs:
                draftToolkitSlugs.length > 0 ? draftToolkitSlugs : undefined,
            },
          },
        });

        await refetch();
        const createdId = result.data?.createSkill?.id;

        if (isDefined(createdId)) {
          setSelectedSkillId(createdId);
          setIsCreating(false);
        }

        enqueueSuccessSnackBar({ message: t`Skill created` });
      } else if (isDefined(selectedSkillId)) {
        await updateSkill({
          variables: {
            input: {
              id: selectedSkillId,
              label: draftLabel.trim(),
              description: draftDescription.trim() || undefined,
              content: draftContent,
              toolkitSlugs:
                draftToolkitSlugs.length > 0 ? draftToolkitSlugs : null,
            },
          },
        });
        await refetch();
        enqueueSuccessSnackBar({ message: t`Skill saved` });
      }
    } catch {
      enqueueErrorSnackBar({ message: t`Failed to save skill` });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!isDefined(selectedSkillId) || !isOwner) {
      return;
    }

    try {
      await deleteSkill({ variables: { id: selectedSkillId } });
      await refetch();
      setSelectedSkillId(null);
      setIsCreating(false);
      enqueueSuccessSnackBar({ message: t`Skill deleted` });
    } catch {
      enqueueErrorSnackBar({ message: t`Failed to delete skill` });
    }
  };

  const renderSkillList = (
    title: string,
    items: SkillFieldsFragment[],
  ) => {
    if (items.length === 0) {
      return null;
    }

    return (
      <>
        <StyledSectionTitle>{title}</StyledSectionTitle>
        {items.map((skill) => (
          <StyledSkillButton
            key={skill.id}
            type="button"
            $active={selectedSkillId === skill.id && !isCreating}
            onClick={() => loadSkillIntoDraft(skill)}
          >
            <StyledSkillLabel>{skill.label}</StyledSkillLabel>
            {isDefined(skill.description) ? (
              <StyledSkillDescription>{skill.description}</StyledSkillDescription>
            ) : null}
            {isDefined(skill.toolkitSlugs) && skill.toolkitSlugs.length > 0 ? (
              <StyledToolkitRow>
                {skill.toolkitSlugs.join(', ')}
              </StyledToolkitRow>
            ) : null}
          </StyledSkillButton>
        ))}
      </>
    );
  };

  return (
    <PageCardLayout
      header={
        <PageCardHeader icon={<IconBook size={16} />} title={t`Skills`} />
      }
    >
      <PageTitle title={t`Skills`} />
      <StyledLayout>
        <StyledActions>
          <Button
            title={t`New skill`}
            Icon={IconPlus}
            onClick={handleStartCreate}
          />
        </StyledActions>
        <StyledSplit>
          <StyledList>
            {loading && skills.length === 0 ? (
              <StyledEmpty>{t`Loading skills…`}</StyledEmpty>
            ) : null}
            {renderSkillList(t`Mine`, mine)}
            {renderSkillList(t`Shared with me`, sharedWithMe)}
            {renderSkillList(t`Workspace`, workspaceSkills)}
            {!loading && skills.length === 0 ? (
              <StyledEmpty>{t`No skills yet. Create one or ask chat to save a procedure.`}</StyledEmpty>
            ) : null}
          </StyledList>
          <StyledDetail>
            {isSharing && isDefined(selectedSkillId) ? (
              <SkillShareDialog
                skillId={selectedSkillId}
                onClose={() => setIsSharing(false)}
              />
            ) : isCreating || isDefined(selectedSkill) ? (
              <>
                <TextInput
                  label={t`Title`}
                  value={draftLabel}
                  onChange={setDraftLabel}
                  disabled={
                    isDefined(selectedSkill) &&
                    selectedSkill.kind !== 'USER'
                  }
                />
                <StyledFieldBlock>
                  <TextInput
                    label={t`Description`}
                    value={draftDescription}
                    onChange={setDraftDescription}
                    disabled={
                      isDefined(selectedSkill) &&
                      selectedSkill.kind !== 'USER'
                    }
                  />
                  <InputHint>
                    {t`A short description of this skill explaining what it does and when agents should use it.`}
                  </InputHint>
                </StyledFieldBlock>
                <StyledFieldBlock>
                  <TextArea
                    textAreaId="skill-instructions-textarea"
                    label={t`Instructions`}
                    value={draftContent}
                    onChange={setDraftContent}
                    disabled={
                      isDefined(selectedSkill) &&
                      selectedSkill.kind !== 'USER'
                    }
                    minRows={12}
                  />
                  <InputHint>
                    {t`What do you want agents to do when using this skill?`}
                  </InputHint>
                </StyledFieldBlock>
                {isComposioEnabled ? (
                  <SkillToolkitPicker
                    value={draftToolkitSlugs}
                    onChange={setDraftToolkitSlugs}
                    disabled={
                      isDefined(selectedSkill) &&
                      selectedSkill.kind !== 'USER'
                    }
                  />
                ) : null}
                {(isCreating || isOwner) && (
                  <StyledActions>
                    <Button
                      title={t`Save`}
                      onClick={handleSave}
                      disabled={
                        isSaving ||
                        !draftLabel.trim() ||
                        !draftContent.trim()
                      }
                    />
                    {isOwner && (
                      <>
                        <Button
                          title={t`Share`}
                          Icon={IconShare}
                          variant="secondary"
                          onClick={() => setIsSharing(true)}
                        />
                        <Button
                          title={t`Delete`}
                          variant="secondary"
                          accent="danger"
                          onClick={handleDelete}
                        />
                      </>
                    )}
                  </StyledActions>
                )}
              </>
            ) : (
              <StyledEmpty>
                {t`Select a skill to view its instructions, or create a new one.`}
              </StyledEmpty>
            )}
          </StyledDetail>
        </StyledSplit>
      </StyledLayout>
    </PageCardLayout>
  );
};
