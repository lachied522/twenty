import { Test, type TestingModule } from '@nestjs/testing';

import { DriveAccessService } from 'src/engine/core-modules/drive/services/drive-access.service';
import { DriveItemEntity } from 'src/engine/core-modules/drive/entities/drive-item.entity';
import { DriveItemShareEntity } from 'src/engine/core-modules/drive/entities/drive-item-share.entity';
import { DriveSpaceEntity } from 'src/engine/core-modules/drive/entities/drive-space.entity';
import { DriveSpaceGrantEntity } from 'src/engine/core-modules/drive/entities/drive-space-grant.entity';
import { UserRoleService } from 'src/engine/metadata-modules/user-role/user-role.service';
import { getWorkspaceScopedRepositoryToken } from 'src/engine/twenty-orm/workspace-scoped-repository/get-workspace-scoped-repository-token.util';

const WORKSPACE_ID = '11111111-1111-4111-8111-111111111111';
const USER_WORKSPACE_ID = '22222222-2222-4222-8222-222222222222';
const OTHER_USER_WORKSPACE_ID = '33333333-3333-4333-8333-333333333333';
const ROLE_ID = '44444444-4444-4444-8444-444444444444';
const PERSONAL_SPACE_ID = '55555555-5555-4555-8555-555555555555';
const FINANCE_SPACE_ID = '66666666-6666-4666-8666-666666666666';
const MARKETING_SPACE_ID = '77777777-7777-4777-8777-777777777777';
const SHARED_ITEM_ID = '88888888-8888-4888-8888-888888888888';

const principal = {
  workspaceId: WORKSPACE_ID,
  userWorkspaceId: USER_WORKSPACE_ID,
};

const personalSpace = {
  id: PERSONAL_SPACE_ID,
  workspaceId: WORKSPACE_ID,
  kind: 'PERSONAL',
  name: 'Personal',
  slug: `personal-${USER_WORKSPACE_ID}`,
  pathPrefix: `personal/${USER_WORKSPACE_ID}`,
  ownerUserWorkspaceId: USER_WORKSPACE_ID,
} as DriveSpaceEntity;

const financeSpace = {
  id: FINANCE_SPACE_ID,
  workspaceId: WORKSPACE_ID,
  kind: 'ORGANISATION',
  name: 'Finance',
  slug: 'finance',
  pathPrefix: 'spaces/finance',
  ownerUserWorkspaceId: null,
} as DriveSpaceEntity;

const marketingSpace = {
  id: MARKETING_SPACE_ID,
  workspaceId: WORKSPACE_ID,
  kind: 'ORGANISATION',
  name: 'Marketing',
  slug: 'marketing',
  pathPrefix: 'spaces/marketing',
  ownerUserWorkspaceId: null,
} as DriveSpaceEntity;

describe('DriveAccessService', () => {
  let service: DriveAccessService;
  let driveSpaceRepository: { find: jest.Mock; findOne: jest.Mock };
  let driveItemRepository: { find: jest.Mock; findOne: jest.Mock };
  let driveSpaceGrantRepository: { find: jest.Mock; findOne: jest.Mock };
  let driveItemShareRepository: { find: jest.Mock; findOne: jest.Mock };
  let userRoleService: { getRolesByUserWorkspaces: jest.Mock };

  beforeEach(async () => {
    driveSpaceRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
    };
    driveItemRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
    };
    driveSpaceGrantRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
    };
    driveItemShareRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
    };
    userRoleService = {
      getRolesByUserWorkspaces: jest
        .fn()
        .mockResolvedValue(new Map([[USER_WORKSPACE_ID, [{ id: ROLE_ID }]]])),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DriveAccessService,
        {
          provide: getWorkspaceScopedRepositoryToken(DriveSpaceEntity),
          useValue: driveSpaceRepository,
        },
        {
          provide: getWorkspaceScopedRepositoryToken(DriveItemEntity),
          useValue: driveItemRepository,
        },
        {
          provide: getWorkspaceScopedRepositoryToken(DriveSpaceGrantEntity),
          useValue: driveSpaceGrantRepository,
        },
        {
          provide: getWorkspaceScopedRepositoryToken(DriveItemShareEntity),
          useValue: driveItemShareRepository,
        },
        {
          provide: UserRoleService,
          useValue: userRoleService,
        },
      ],
    }).compile();

    service = module.get(DriveAccessService);
  });

  it('grants the personal space owner READ_WRITE', async () => {
    driveSpaceRepository.findOne.mockResolvedValue(personalSpace);
    driveItemRepository.findOne.mockResolvedValue(null);

    const resolvedLocation = await service.resolve({
      path: '/personal/notes.md',
      principal,
    });

    expect(resolvedLocation.accessLevel).toBe('READ_WRITE');
    expect(resolvedLocation.space?.id).toBe(PERSONAL_SPACE_ID);
  });

  it('returns the role grant on a visible organisation space', async () => {
    driveSpaceRepository.findOne.mockResolvedValue(financeSpace);
    driveSpaceGrantRepository.find.mockResolvedValue([
      { accessLevel: 'READ', principalId: ROLE_ID, principalType: 'ROLE' },
    ]);
    driveItemRepository.findOne.mockResolvedValue(null);

    const resolvedLocation = await service.resolve({
      path: '/spaces/finance/q1.csv',
      principal,
    });

    expect(resolvedLocation.accessLevel).toBe('READ');
    expect(resolvedLocation.space?.id).toBe(FINANCE_SPACE_ID);
  });

  it('hides organisation spaces with no grant', async () => {
    driveSpaceRepository.findOne.mockResolvedValue(marketingSpace);
    driveSpaceGrantRepository.find.mockResolvedValue([]);
    driveItemRepository.findOne.mockResolvedValue(null);

    const resolvedLocation = await service.resolve({
      path: '/spaces/marketing/secret.pdf',
      principal,
    });

    expect(resolvedLocation.accessLevel).toBeNull();
    expect(resolvedLocation.space).toBeNull();
  });

  it('allows a recipient to access a shared personal item only', async () => {
    const sharedItem = {
      id: SHARED_ITEM_ID,
      workspaceId: WORKSPACE_ID,
      spaceId: PERSONAL_SPACE_ID,
      parentId: null,
      name: 'shared.csv',
      kind: 'FILE',
    } as DriveItemEntity;

    driveItemShareRepository.findOne.mockResolvedValue({
      itemId: SHARED_ITEM_ID,
      userWorkspaceId: USER_WORKSPACE_ID,
      accessLevel: 'READ',
    });
    driveItemRepository.findOne.mockResolvedValue(sharedItem);
    driveSpaceRepository.findOne.mockResolvedValue({
      ...personalSpace,
      ownerUserWorkspaceId: OTHER_USER_WORKSPACE_ID,
    });

    const resolvedLocation = await service.resolve({
      path: `/shared/${SHARED_ITEM_ID}`,
      principal,
    });

    expect(resolvedLocation.accessLevel).toBe('READ');
    expect(resolvedLocation.item?.id).toBe(SHARED_ITEM_ID);
    expect(resolvedLocation.sharedRootItem?.id).toBe(SHARED_ITEM_ID);
  });

  it('denies a path the principal cannot see', async () => {
    driveSpaceRepository.findOne.mockResolvedValue(null);

    const resolvedLocation = await service.resolve({
      path: '/spaces/directors/board.pdf',
      principal,
    });

    expect(resolvedLocation.accessLevel).toBeNull();
    expect(resolvedLocation.space).toBeNull();
  });
});
