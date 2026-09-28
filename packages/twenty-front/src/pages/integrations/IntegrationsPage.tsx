import {
  useComposioActions,
  useComposioToolkitCategories,
  useComposioToolkitDetail,
  useComposioToolkits,
} from '@/integrations/hooks/useComposioQueries';
import {
  type ComposioAccountStatus,
  type ComposioToolkitConnectionStatus,
  type ComposioToolkitSummary,
} from '@/integrations/types/Composio';
import { TextInput } from '@/ui/input/components/TextInput';
import { PageCardHeader } from '@/ui/layout/page/components/PageCardHeader';
import { PageCardLayout } from '@/ui/layout/page/components/PageCardLayout';
import { PageTitle } from '@/ui/utilities/page-title/components/PageTitle';
import { useSnackBar } from '@/ui/feedback/snack-bar-manager/hooks/useSnackBar';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';
import { useSearchParams } from 'react-router-dom';
import { AppPath } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';
import { isNonEmptyString } from '@sniptt/guards';
import { IconPlug, IconSearch, IconX } from 'twenty-ui/icon';
import { Button } from 'twenty-ui/input';
import { ThemeContext, themeCssVariables } from 'twenty-ui/theme-constants';

const PENDING_ACCOUNT_STORAGE_KEY = 'gizmo.composio.pendingAccount';
const MAX_ACCOUNTS_PER_TOOLKIT = 5;

// Survives Strict Mode double-invoke without useRef (disallowed for state)
let lastHandledOAuthCallbackKey: string | null = null;

const StyledLayout = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[4]};
  height: 100%;
  min-height: 0;
  overflow: auto;
  padding: ${themeCssVariables.spacing[4]};
`;

const StyledSearchRow = styled.div`
  max-width: 360px;
`;

const StyledCategoryTabs = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledCategoryTab = styled.button<{ $active: boolean }>`
  align-items: center;
  background: ${({ $active }) =>
    $active
      ? themeCssVariables.background.transparent.light
      : themeCssVariables.background.secondary};
  border: 1px solid
    ${({ $active }) =>
      $active
        ? themeCssVariables.border.color.strong
        : themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.pill};
  color: ${themeCssVariables.font.color.primary};
  cursor: pointer;
  display: inline-flex;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[1]} ${themeCssVariables.spacing[3]};

  &:hover {
    background: ${themeCssVariables.background.transparent.light};
  }
`;

const StyledCountChip = styled.span`
  background: ${themeCssVariables.background.tertiary};
  border-radius: ${themeCssVariables.border.radius.pill};
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.xs};
  font-weight: ${themeCssVariables.font.weight.medium};
  line-height: 1.4;
  min-width: 1.25rem;
  padding: 1px ${themeCssVariables.spacing[1]};
  text-align: center;
`;

const StyledSplit = styled.div`
  align-items: start;
  display: grid;
  flex: 1 0 auto;
  gap: ${themeCssVariables.spacing[4]};
  grid-template-columns: minmax(0, 1fr) minmax(280px, 360px);

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const StyledList = styled.div`
  container-type: inline-size;
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[3]};
  min-height: 0;
  min-width: 0;
`;

const StyledCardGrid = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[3]};
  grid-template-columns: repeat(3, minmax(0, 1fr));

  @container (max-width: 480px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @container (max-width: 320px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

const StyledToolkitCard = styled.button<{ $active: boolean }>`
  align-items: stretch;
  background: ${({ $active }) =>
    $active
      ? themeCssVariables.background.transparent.light
      : themeCssVariables.background.secondary};
  border: 1px solid
    ${({ $active }) =>
      $active
        ? themeCssVariables.border.color.strong
        : themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.md};
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
  height: 100%;
  min-width: 0;
  padding: ${themeCssVariables.spacing[3]};
  text-align: left;

  &:hover {
    background: ${themeCssVariables.background.transparent.light};
  }
`;

const StyledCardTop = styled.div`
  align-items: flex-start;
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: space-between;
  width: 100%;
`;

const StyledSkeletonCard = styled.div`
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.md};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[3]};
`;

const StyledSkeletonStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
  width: 100%;
`;

const TOOLKIT_SKELETON_COUNT = 9;

const StyledConnectedBadge = styled.span`
  background: ${themeCssVariables.color.green3};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.color.green9};
  font-size: ${themeCssVariables.font.size.xs};
  font-weight: ${themeCssVariables.font.weight.medium};
  line-height: 1.4;
  padding: 2px ${themeCssVariables.spacing[1]};
  white-space: nowrap;
`;

const StyledLogo = styled.img`
  border-radius: ${themeCssVariables.border.radius.sm};
  height: 32px;
  object-fit: contain;
  width: 32px;
`;

const StyledLogoFallback = styled.div`
  align-items: center;
  background: ${themeCssVariables.background.tertiary};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.tertiary};
  display: flex;
  flex-shrink: 0;
  height: 32px;
  justify-content: center;
  width: 32px;
`;

const StyledToolkitMeta = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
  min-width: 0;
`;

const StyledToolkitName = styled.div`
  color: ${themeCssVariables.font.color.primary};
  font-weight: ${themeCssVariables.font.weight.medium};
`;

const StyledToolkitDescription = styled.div`
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  color: ${themeCssVariables.font.color.tertiary};
  display: -webkit-box;
  font-size: ${themeCssVariables.font.size.sm};
  overflow: hidden;
`;

const StyledStatus = styled.span<{ $tone: string }>`
  color: ${({ $tone }) => $tone};
  font-size: ${themeCssVariables.font.size.sm};
  white-space: nowrap;
`;

const StyledDetail = styled.div`
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.md};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[3]};
  max-height: calc(100vh - 160px);
  min-height: 240px;
  overflow: auto;
  padding: ${themeCssVariables.spacing[4]};
  position: sticky;
  top: 0;
`;

const StyledDetailTitle = styled.h2`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.lg};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  margin: 0;
`;

const StyledDetailDescription = styled.p`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.sm};
  margin: 0;
`;

const StyledAccountRow = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: space-between;
`;

const StyledField = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
`;

const StyledEmpty = styled.div`
  color: ${themeCssVariables.font.color.tertiary};
  padding: ${themeCssVariables.spacing[4]};
  text-align: center;
`;

const statusTone = (
  status: ComposioToolkitConnectionStatus | ComposioAccountStatus,
): string => {
  switch (status) {
    case 'connected':
    case 'active':
      return themeCssVariables.color.green9;
    case 'needs_reauth':
    case 'inactive':
      return themeCssVariables.color.orange9;
    case 'pending':
      return themeCssVariables.color.blue9;
    default:
      return themeCssVariables.font.color.tertiary;
  }
};

const toolkitStatusLabel = (
  status: ComposioToolkitConnectionStatus,
  connectedLabel: string,
  needsReauthLabel: string,
  notConnectedLabel: string,
) => {
  switch (status) {
    case 'connected':
      return connectedLabel;
    case 'needs_reauth':
      return needsReauthLabel;
    case 'not_connected':
      return notConnectedLabel;
  }
};

const accountStatusLabel = (
  status: ComposioAccountStatus,
  labels: Record<ComposioAccountStatus, string>,
) => labels[status];

const isSecretField = (field: {
  name: string;
  type: string;
  displayName: string;
}) => {
  const haystack =
    `${field.name} ${field.type} ${field.displayName}`.toLowerCase();

  return (
    field.type.toLowerCase() === 'password' ||
    haystack.includes('password') ||
    haystack.includes('secret') ||
    haystack.includes('token') ||
    haystack.includes('api_key') ||
    haystack.includes('apikey') ||
    haystack.includes('key')
  );
};

const storePendingAccount = (toolkitSlug: string, accountId: string) => {
  sessionStorage.setItem(
    PENDING_ACCOUNT_STORAGE_KEY,
    JSON.stringify({ toolkitSlug, accountId }),
  );
};

const readPendingAccount = (toolkitSlug: string): string | null => {
  try {
    const raw = sessionStorage.getItem(PENDING_ACCOUNT_STORAGE_KEY);

    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as {
      toolkitSlug?: string;
      accountId?: string;
    };

    if (parsed.toolkitSlug !== toolkitSlug || !parsed.accountId) {
      return null;
    }

    return parsed.accountId;
  } catch {
    return null;
  }
};

const clearPendingAccount = () => {
  sessionStorage.removeItem(PENDING_ACCOUNT_STORAGE_KEY);
};

const buildCallbackUrl = (toolkitSlug: string, accountId?: string) => {
  const params = new URLSearchParams({
    toolkit: toolkitSlug,
    status: 'success',
  });

  if (accountId) {
    params.set('account', accountId);
  }

  return `${globalThis.location.origin}${AppPath.Integrations}?${params.toString()}`;
};

type IntegrationsCategoryTabProps = {
  label: string;
  count: number;
  isActive: boolean;
  onSelect: () => void;
};

const IntegrationsCategoryTab = ({
  label,
  count,
  isActive,
  onSelect,
}: IntegrationsCategoryTabProps) => (
  <StyledCategoryTab
    type="button"
    role="tab"
    aria-selected={isActive}
    $active={isActive}
    onClick={onSelect}
  >
    <span>{label}</span>
    <StyledCountChip>{count.toLocaleString()}</StyledCountChip>
  </StyledCategoryTab>
);

const IntegrationsToolkitGridSkeleton = () => {
  const { theme } = useContext(ThemeContext);

  return (
    <SkeletonTheme
      baseColor={theme.background.tertiary}
      highlightColor={theme.background.transparent.lighter}
      borderRadius={4}
    >
      <StyledCardGrid aria-busy="true" aria-live="polite">
        {Array.from({ length: TOOLKIT_SKELETON_COUNT }, (_, index) => (
          <StyledSkeletonCard key={index}>
            <Skeleton width={32} height={32} />
            <Skeleton width="70%" height={16} />
            <Skeleton width="100%" height={12} />
            <Skeleton width="85%" height={12} />
          </StyledSkeletonCard>
        ))}
      </StyledCardGrid>
    </SkeletonTheme>
  );
};

const IntegrationsDetailSkeleton = () => {
  const { theme } = useContext(ThemeContext);

  return (
    <SkeletonTheme
      baseColor={theme.background.tertiary}
      highlightColor={theme.background.transparent.lighter}
      borderRadius={4}
    >
      <StyledSkeletonStack aria-busy="true" aria-live="polite">
        <Skeleton width="55%" height={20} />
        <Skeleton width="100%" height={12} />
        <Skeleton width="92%" height={12} />
        <Skeleton width={96} height={14} />
      </StyledSkeletonStack>
    </SkeletonTheme>
  );
};

export const IntegrationsPage = () => {
  const { t } = useLingui();
  const { enqueueSuccessSnackBar, enqueueErrorSnackBar } = useSnackBar();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  );
  const [selectedSlug, setSelectedSlug] = useState<string | null>(() =>
    searchParams.get('toolkit'),
  );
  const [credentialValues, setCredentialValues] = useState<
    Record<string, string>
  >({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [aliasDraft, setAliasDraft] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 250);

    return () => window.clearTimeout(timer);
  }, [search]);

  const searchTooShort =
    debouncedSearch.length > 0 && debouncedSearch.length < 3;
  const isSearchingAllCategories = debouncedSearch.length >= 3;

  const clearSearch = () => {
    setSearch('');
    setDebouncedSearch('');
  };

  const handleSelectCategory = (categoryId: string | null) => {
    setSelectedCategoryId(categoryId);
    clearSearch();
  };

  const {
    totalCount,
    categories,
    loading: categoriesLoading,
  } = useComposioToolkitCategories();
  const { items, nextCursor, loading, refetch, loadMore } = useComposioToolkits(
    searchTooShort ? '' : debouncedSearch,
    {
      categoryId: isSearchingAllCategories ? null : selectedCategoryId,
    },
  );
  const {
    detail,
    loading: detailLoading,
    refetch: refetchDetail,
  } = useComposioToolkitDetail(selectedSlug);
  const { connect, waitForAccount, refresh, remove } = useComposioActions();

  const accountLabels = useMemo(
    () => ({
      active: t`Active`,
      needs_reauth: t`Needs reauthorising`,
      inactive: t`Inactive`,
      pending: t`Pending`,
    }),
    [t],
  );

  const handleSelectToolkit = (toolkit: ComposioToolkitSummary) => {
    setSelectedSlug(toolkit.slug);
    setCredentialValues({});
    setAliasDraft('');
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);

      next.set('toolkit', toolkit.slug);
      next.delete('status');
      next.delete('account');

      return next;
    });
  };

  const handleConnect = async () => {
    if (!isDefined(detail)) {
      return;
    }

    setBusyId('connect');

    try {
      if (detail.connectMode === 'credentials') {
        const missing = detail.connectFields
          .filter((field) => field.required)
          .filter((field) => !credentialValues[field.name]?.trim());

        if (missing.length > 0) {
          enqueueErrorSnackBar({
            message: t`Missing required fields`,
          });

          return;
        }
      }

      const result = await connect({
        toolkitSlug: detail.slug,
        callbackUrl: buildCallbackUrl(detail.slug),
        alias: aliasDraft.trim() || undefined,
        credentials:
          detail.connectMode === 'credentials' ? credentialValues : undefined,
      });

      if (isNonEmptyString(result.redirectUrl)) {
        storePendingAccount(detail.slug, result.connectedAccountId);
        globalThis.location.assign(result.redirectUrl);

        return;
      }

      enqueueSuccessSnackBar({ message: t`Connected` });
      await Promise.all([refetch(), refetchDetail()]);
      setCredentialValues({});
    } catch (error) {
      enqueueErrorSnackBar({
        message: error instanceof Error ? error.message : t`Failed to connect`,
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleWaitForPending = useCallback(
    async (toolkitSlug: string, accountId: string) => {
      setBusyId('wait');

      try {
        await waitForAccount(accountId);
        clearPendingAccount();
        enqueueSuccessSnackBar({ message: t`Connected` });
        await Promise.all([refetch(), refetchDetail()]);
      } catch (error) {
        enqueueErrorSnackBar({
          message:
            error instanceof Error
              ? error.message
              : t`Could not confirm connection`,
        });
      } finally {
        setBusyId(null);
        setSearchParams((previous) => {
          const next = new URLSearchParams(previous);

          next.set('toolkit', toolkitSlug);
          next.delete('status');
          next.delete('account');

          return next;
        });
      }
    },
    [
      enqueueErrorSnackBar,
      enqueueSuccessSnackBar,
      refetch,
      refetchDetail,
      setSearchParams,
      t,
      waitForAccount,
    ],
  );

  useEffect(() => {
    const status = searchParams.get('status');
    const toolkitSlug = searchParams.get('toolkit');
    const accountId =
      searchParams.get('account') ??
      (toolkitSlug ? readPendingAccount(toolkitSlug) : null);

    if (status !== 'success' || !toolkitSlug || !accountId) {
      return;
    }

    const callbackKey = `${toolkitSlug}:${accountId}`;

    if (lastHandledOAuthCallbackKey === callbackKey) {
      return;
    }

    lastHandledOAuthCallbackKey = callbackKey;
    setSelectedSlug(toolkitSlug);
    void handleWaitForPending(toolkitSlug, accountId);
  }, [handleWaitForPending, searchParams]);

  const handleRefresh = async (accountId: string) => {
    if (!isDefined(detail)) {
      return;
    }

    setBusyId(accountId);

    try {
      const result = await refresh({
        accountId,
        redirectUrl: buildCallbackUrl(detail.slug, accountId),
      });

      if (isNonEmptyString(result.redirectUrl)) {
        storePendingAccount(detail.slug, accountId);
        globalThis.location.assign(result.redirectUrl);

        return;
      }

      enqueueSuccessSnackBar({ message: t`Reauthorised` });
      await refetchDetail();
    } catch (error) {
      enqueueErrorSnackBar({
        message:
          error instanceof Error ? error.message : t`Failed to reauthorise`,
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (accountId: string) => {
    setBusyId(accountId);

    try {
      await remove(accountId);
      enqueueSuccessSnackBar({ message: t`Disconnected` });
      await Promise.all([refetch(), refetchDetail()]);
    } catch (error) {
      enqueueErrorSnackBar({
        message:
          error instanceof Error ? error.message : t`Failed to disconnect`,
      });
    } finally {
      setBusyId(null);
    }
  };

  const canConnect =
    isDefined(detail) &&
    detail.connectMode !== 'unavailable' &&
    detail.connectMode !== 'none' &&
    detail.accounts.length < MAX_ACCOUNTS_PER_TOOLKIT;

  return (
    <PageCardLayout
      header={
        <PageCardHeader icon={<IconPlug size={16} />} title={t`Integrations`} />
      }
    >
      <PageTitle title={t`Integrations`} />
      <StyledLayout>
        <StyledSearchRow>
          <TextInput
            value={search}
            onChange={setSearch}
            placeholder={t`Search integrations`}
            fullWidth
            LeftIcon={IconSearch}
            RightIcon={isNonEmptyString(search) ? IconX : undefined}
            onRightIconClick={
              isNonEmptyString(search) ? clearSearch : undefined
            }
          />
        </StyledSearchRow>
        {!categoriesLoading && (totalCount > 0 || categories.length > 0) ? (
          <StyledCategoryTabs role="tablist" aria-label={t`Categories`}>
            <IntegrationsCategoryTab
              label={t`All`}
              count={totalCount}
              isActive={
                !isSearchingAllCategories && selectedCategoryId === null
              }
              onSelect={() => handleSelectCategory(null)}
            />
            {categories.map((category) => (
              <IntegrationsCategoryTab
                key={category.id}
                label={category.name}
                count={category.toolkitCount}
                isActive={
                  !isSearchingAllCategories &&
                  selectedCategoryId === category.id
                }
                onSelect={() => handleSelectCategory(category.id)}
              />
            ))}
          </StyledCategoryTabs>
        ) : null}
        {searchTooShort ? (
          <StyledEmpty>{t`Keep trying to search integrations`}</StyledEmpty>
        ) : (
          <StyledSplit>
            <StyledList>
              {loading && items.length === 0 ? (
                <IntegrationsToolkitGridSkeleton />
              ) : items.length === 0 ? (
                <StyledEmpty>{t`No integrations found`}</StyledEmpty>
              ) : (
                <StyledCardGrid>
                  {items.map((toolkit) => (
                    <StyledToolkitCard
                      key={toolkit.slug}
                      type="button"
                      $active={selectedSlug === toolkit.slug}
                      onClick={() => handleSelectToolkit(toolkit)}
                    >
                      <StyledCardTop>
                        {toolkit.logo ? (
                          <StyledLogo src={toolkit.logo} alt="" />
                        ) : (
                          <StyledLogoFallback>
                            <IconPlug size={16} />
                          </StyledLogoFallback>
                        )}
                        {toolkit.status === 'connected' ? (
                          <StyledConnectedBadge>
                            {t`Connected`}
                          </StyledConnectedBadge>
                        ) : null}
                      </StyledCardTop>
                      <StyledToolkitMeta>
                        <StyledToolkitName>{toolkit.name}</StyledToolkitName>
                        <StyledToolkitDescription>
                          {toolkit.description}
                        </StyledToolkitDescription>
                      </StyledToolkitMeta>
                    </StyledToolkitCard>
                  ))}
                </StyledCardGrid>
              )}
              {isNonEmptyString(nextCursor) ? (
                <Button
                  title={t`Load more`}
                  onClick={() => void loadMore()}
                  variant="secondary"
                />
              ) : null}
            </StyledList>
            <StyledDetail>
              {!selectedSlug ? (
                <StyledEmpty>
                  {t`Select an integration to connect your account`}
                </StyledEmpty>
              ) : detailLoading && !detail ? (
                <IntegrationsDetailSkeleton />
              ) : !detail ? (
                <StyledEmpty>{t`Integration not found`}</StyledEmpty>
              ) : (
                <>
                  <StyledDetailTitle>{detail.name}</StyledDetailTitle>
                  <StyledDetailDescription>
                    {detail.description}
                  </StyledDetailDescription>
                  <StyledStatus $tone={statusTone(detail.status)}>
                    {toolkitStatusLabel(
                      detail.status,
                      t`Connected`,
                      t`Needs reauthorising`,
                      t`Not connected`,
                    )}
                  </StyledStatus>
                  {detail.configurationError ? (
                    <StyledEmpty>{detail.configurationError}</StyledEmpty>
                  ) : null}
                  {detail.accounts.length > 0 ? (
                    <>
                      <StyledToolkitName>{t`Connected accounts`}</StyledToolkitName>
                      {detail.accounts.map((account) => (
                        <StyledAccountRow key={account.id}>
                          <div>
                            <div>
                              {account.alias?.trim() || account.id.slice(0, 8)}
                            </div>
                            <StyledStatus $tone={statusTone(account.status)}>
                              {accountStatusLabel(
                                account.status,
                                accountLabels,
                              )}
                            </StyledStatus>
                          </div>
                          <div
                            style={{
                              display: 'flex',
                              gap: 8,
                            }}
                          >
                            {account.status === 'needs_reauth' ? (
                              <Button
                                title={t`Reauthorise`}
                                size="small"
                                variant="secondary"
                                disabled={busyId === account.id}
                                onClick={() => void handleRefresh(account.id)}
                              />
                            ) : null}
                            <Button
                              title={t`Disconnect`}
                              size="small"
                              variant="secondary"
                              accent="danger"
                              disabled={busyId === account.id}
                              onClick={() => void handleDelete(account.id)}
                            />
                          </div>
                        </StyledAccountRow>
                      ))}
                    </>
                  ) : null}
                  {canConnect ? (
                    <>
                      <StyledField>
                        <TextInput
                          value={aliasDraft}
                          onChange={setAliasDraft}
                          placeholder={t`Optional alias`}
                          fullWidth
                        />
                      </StyledField>
                      {detail.connectMode === 'credentials'
                        ? detail.connectFields.map((field) => (
                            <StyledField key={field.name}>
                              <TextInput
                                value={credentialValues[field.name] ?? ''}
                                onChange={(value) =>
                                  setCredentialValues((previous) => ({
                                    ...previous,
                                    [field.name]: value,
                                  }))
                                }
                                placeholder={field.displayName}
                                type={
                                  isSecretField(field) ? 'password' : 'text'
                                }
                                fullWidth
                              />
                            </StyledField>
                          ))
                        : null}
                      <Button
                        title={
                          detail.connectMode === 'credentials'
                            ? t`Connect with credentials`
                            : t`Connect`
                        }
                        accent="blue"
                        disabled={busyId === 'connect' || busyId === 'wait'}
                        onClick={() => void handleConnect()}
                      />
                    </>
                  ) : null}
                </>
              )}
            </StyledDetail>
          </StyledSplit>
        )}
      </StyledLayout>
    </PageCardLayout>
  );
};
