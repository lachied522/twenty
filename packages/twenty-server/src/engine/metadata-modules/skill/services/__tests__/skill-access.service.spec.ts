import { SkillAccessService } from 'src/engine/metadata-modules/skill/services/skill-access.service';
import { type FlatSkill } from 'src/engine/metadata-modules/flat-skill/types/flat-skill.type';

describe('SkillAccessService', () => {
  const skillShareRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    insertAndReturnOne: jest.fn(),
    delete: jest.fn(),
  };
  const userRoleService = {
    getRolesByUserWorkspaces: jest.fn(),
    getRoleIdForUserWorkspace: jest.fn(),
  };

  const service = new SkillAccessService(
    skillShareRepository as never,
    userRoleService as never,
  );

  const principal = {
    workspaceId: 'workspace-1',
    userWorkspaceId: 'user-1',
    roleId: 'role-1',
    hasAiSettings: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    userRoleService.getRolesByUserWorkspaces.mockResolvedValue(
      new Map([['user-1', [{ id: 'role-1' }]]]),
    );
    skillShareRepository.find.mockResolvedValue([]);
  });

  it('gives every member READ on active SYSTEM skills', async () => {
    const accessLevel = await service.resolveAccessLevel({
      skill: {
        id: 'skill-1',
        kind: 'SYSTEM',
        ownerUserWorkspaceId: null,
        isActive: true,
        isSystem: true,
      } as Pick<
        FlatSkill,
        'id' | 'kind' | 'ownerUserWorkspaceId' | 'isActive' | 'isSystem'
      >,
      principal,
    });

    expect(accessLevel).toBe('READ');
  });

  it('gives the owner READ_WRITE on USER skills', async () => {
    const accessLevel = await service.resolveAccessLevel({
      skill: {
        id: 'skill-2',
        kind: 'USER',
        ownerUserWorkspaceId: 'user-1',
        isActive: true,
        isSystem: false,
      } as Pick<
        FlatSkill,
        'id' | 'kind' | 'ownerUserWorkspaceId' | 'isActive' | 'isSystem'
      >,
      principal,
    });

    expect(accessLevel).toBe('READ_WRITE');
  });

  it('denies unrelated users on private USER skills', async () => {
    const accessLevel = await service.resolveAccessLevel({
      skill: {
        id: 'skill-3',
        kind: 'USER',
        ownerUserWorkspaceId: 'user-2',
        isActive: true,
        isSystem: false,
      } as Pick<
        FlatSkill,
        'id' | 'kind' | 'ownerUserWorkspaceId' | 'isActive' | 'isSystem'
      >,
      principal,
    });

    expect(accessLevel).toBeNull();
  });

  it('grants shared members the share access level', async () => {
    skillShareRepository.find.mockResolvedValue([
      { accessLevel: 'READ_WRITE' },
    ]);

    const accessLevel = await service.resolveAccessLevel({
      skill: {
        id: 'skill-4',
        kind: 'USER',
        ownerUserWorkspaceId: 'user-2',
        isActive: true,
        isSystem: false,
      } as Pick<
        FlatSkill,
        'id' | 'kind' | 'ownerUserWorkspaceId' | 'isActive' | 'isSystem'
      >,
      principal,
    });

    expect(accessLevel).toBe('READ_WRITE');
  });

  it('denies GIZMO skills in this cut', async () => {
    const accessLevel = await service.resolveAccessLevel({
      skill: {
        id: 'skill-5',
        kind: 'GIZMO',
        ownerUserWorkspaceId: null,
        isActive: true,
        isSystem: false,
      } as Pick<
        FlatSkill,
        'id' | 'kind' | 'ownerUserWorkspaceId' | 'isActive' | 'isSystem'
      >,
      principal,
    });

    expect(accessLevel).toBeNull();
  });

  it('gives AI settings admins READ_WRITE on WORKSPACE skills', async () => {
    const accessLevel = await service.resolveAccessLevel({
      skill: {
        id: 'skill-6',
        kind: 'WORKSPACE',
        ownerUserWorkspaceId: null,
        isActive: false,
        isSystem: false,
      } as Pick<
        FlatSkill,
        'id' | 'kind' | 'ownerUserWorkspaceId' | 'isActive' | 'isSystem'
      >,
      principal: { ...principal, hasAiSettings: true },
    });

    expect(accessLevel).toBe('READ_WRITE');
  });
});
