import {
  useComposioToolkitDetail,
  useComposioToolkits,
} from '@/integrations/hooks/useComposioQueries';
import { type ComposioToolkitSummary } from '@/integrations/types/Composio';
import { TextInput } from '@/ui/input/components/TextInput';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { useMemo, useState } from 'react';
import { isDefined } from 'twenty-shared/utils';
import { IconPlug, IconX } from 'twenty-ui/icon';
import { InputHint } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const MAX_VISIBLE_SEARCH_RESULTS = 8;

const StyledContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledLabel = styled.div`
  color: ${themeCssVariables.font.color.light};
  font-size: ${themeCssVariables.font.size.xs};
  font-weight: ${themeCssVariables.font.weight.semiBold};
`;

const StyledSelectedList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledChip = styled.div`
  align-items: center;
  background: ${themeCssVariables.background.transparent.light};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.md};
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[1]} ${themeCssVariables.spacing[2]};
`;

const StyledChipName = styled.span`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.sm};
`;

const StyledRemoveButton = styled.button`
  align-items: center;
  background: transparent;
  border: none;
  color: ${themeCssVariables.font.color.tertiary};
  cursor: pointer;
  display: flex;
  padding: 0;

  &:disabled {
    cursor: default;
    opacity: 0.5;
  }

  &:hover:not(:disabled) {
    color: ${themeCssVariables.font.color.primary};
  }
`;

const StyledLogo = styled.img`
  border-radius: ${themeCssVariables.border.radius.sm};
  height: 20px;
  object-fit: contain;
  width: 20px;
`;

const StyledLogoLarge = styled.img`
  border-radius: ${themeCssVariables.border.radius.sm};
  height: 28px;
  object-fit: contain;
  width: 28px;
`;

const StyledLogoFallback = styled.div`
  align-items: center;
  background: ${themeCssVariables.background.tertiary};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.tertiary};
  display: flex;
  height: 20px;
  justify-content: center;
  width: 20px;
`;

const StyledLogoFallbackLarge = styled.div`
  align-items: center;
  background: ${themeCssVariables.background.tertiary};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.tertiary};
  display: flex;
  height: 28px;
  justify-content: center;
  width: 28px;
`;

const StyledResults = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
  max-height: 240px;
  overflow: auto;
`;

const StyledResultButton = styled.button`
  align-items: center;
  background: ${themeCssVariables.background.secondary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.md};
  cursor: pointer;
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[2]};
  text-align: left;
  width: 100%;

  &:hover:not(:disabled) {
    background: ${themeCssVariables.background.transparent.light};
  }

  &:disabled {
    cursor: default;
    opacity: 0.6;
  }
`;

const StyledResultMeta = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
  min-width: 0;
`;

const StyledResultName = styled.div`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.sm};
  font-weight: ${themeCssVariables.font.weight.medium};
`;

const StyledResultDescription = styled.div`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.xs};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const StyledEmpty = styled.div`
  color: ${themeCssVariables.font.color.light};
  font-size: ${themeCssVariables.font.size.sm};
  padding: ${themeCssVariables.spacing[1]} 0;
`;

type SkillToolkitPickerProps = {
  value: string[];
  onChange: (toolkitSlugs: string[]) => void;
  disabled?: boolean;
};

const ToolkitLogo = ({
  logo,
  large = false,
}: {
  logo: string | null | undefined;
  large?: boolean;
}) => {
  if (isDefined(logo) && logo.length > 0) {
    return large ? (
      <StyledLogoLarge src={logo} alt="" />
    ) : (
      <StyledLogo src={logo} alt="" />
    );
  }

  const Fallback = large ? StyledLogoFallbackLarge : StyledLogoFallback;

  return (
    <Fallback>
      <IconPlug size={large ? 16 : 12} />
    </Fallback>
  );
};

const SelectedToolkitChip = ({
  slug,
  disabled,
  onRemove,
}: {
  slug: string;
  disabled: boolean;
  onRemove: () => void;
}) => {
  const { detail } = useComposioToolkitDetail(slug);
  const name = detail?.name ?? slug;

  return (
    <StyledChip>
      <ToolkitLogo logo={detail?.logo} />
      <StyledChipName>{name}</StyledChipName>
      {!disabled ? (
        <StyledRemoveButton
          type="button"
          aria-label={`Remove ${name}`}
          onClick={onRemove}
        >
          <IconX size={14} />
        </StyledRemoveButton>
      ) : null}
    </StyledChip>
  );
};

export const SkillToolkitPicker = ({
  value,
  onChange,
  disabled = false,
}: SkillToolkitPickerProps) => {
  const { t } = useLingui();
  const [search, setSearch] = useState('');
  const { items, loading } = useComposioToolkits(search, {
    requireMinSearchLength: true,
  });

  const selectedSlugSet = useMemo(() => new Set(value), [value]);
  const trimmedSearch = search.trim();
  const searchTooShort =
    trimmedSearch.length > 0 && trimmedSearch.length < 3;
  const showResults = trimmedSearch.length >= 3;

  const visibleResults = useMemo(() => {
    if (!showResults) {
      return [];
    }

    return items
      .filter((toolkit) => !selectedSlugSet.has(toolkit.slug))
      .slice(0, MAX_VISIBLE_SEARCH_RESULTS);
  }, [items, selectedSlugSet, showResults]);

  const handleAdd = (toolkit: ComposioToolkitSummary) => {
    if (disabled || selectedSlugSet.has(toolkit.slug)) {
      return;
    }

    onChange([...value, toolkit.slug]);
    setSearch('');
  };

  const handleRemove = (slug: string) => {
    if (disabled) {
      return;
    }

    onChange(value.filter((selectedSlug) => selectedSlug !== slug));
  };

  return (
    <StyledContainer>
      <StyledLabel>{t`Integrations`}</StyledLabel>
      <InputHint>
        {t`Optional. Pick the third-party tools this skill should use.`}
      </InputHint>
      {value.length > 0 ? (
        <StyledSelectedList>
          {value.map((slug) => (
            <SelectedToolkitChip
              key={slug}
              slug={slug}
              disabled={disabled}
              onRemove={() => handleRemove(slug)}
            />
          ))}
        </StyledSelectedList>
      ) : null}
      {!disabled ? (
        <>
          <TextInput
            value={search}
            onChange={setSearch}
            placeholder={t`Search integrations`}
            fullWidth
          />
          {searchTooShort ? (
            <StyledEmpty>
              {t`Keep trying to search integrations`}
            </StyledEmpty>
          ) : null}
          {showResults ? (
            <StyledResults>
              {loading && visibleResults.length === 0 ? (
                <StyledEmpty>{t`Searching…`}</StyledEmpty>
              ) : visibleResults.length === 0 ? (
                <StyledEmpty>{t`No integrations found`}</StyledEmpty>
              ) : (
                visibleResults.map((toolkit) => (
                  <StyledResultButton
                    key={toolkit.slug}
                    type="button"
                    onClick={() => handleAdd(toolkit)}
                  >
                    <ToolkitLogo logo={toolkit.logo} large />
                    <StyledResultMeta>
                      <StyledResultName>{toolkit.name}</StyledResultName>
                      {isDefined(toolkit.description) &&
                      toolkit.description.length > 0 ? (
                        <StyledResultDescription>
                          {toolkit.description}
                        </StyledResultDescription>
                      ) : null}
                    </StyledResultMeta>
                  </StyledResultButton>
                ))
              )}
            </StyledResults>
          ) : null}
        </>
      ) : null}
    </StyledContainer>
  );
};
