import { FileFolder } from 'twenty-shared/types';
import { Test, type TestingModule } from '@nestjs/testing';

import { FileEntity } from 'src/engine/core-modules/file/entities/file.entity';
import { FileUrlService } from 'src/engine/core-modules/file/file-url/file-url.service';
import { DeliverFileTool } from 'src/engine/core-modules/tool/tools/deliver-file-tool/deliver-file.tool';
import { getWorkspaceScopedRepositoryToken } from 'src/engine/twenty-orm/workspace-scoped-repository/get-workspace-scoped-repository-token.util';

const FILE_ID = '1f0c8d2e-3b4a-4c5d-8e6f-7a8b9c0d1e2f';

describe('DeliverFileTool', () => {
  let tool: DeliverFileTool;
  let mockFindOne: jest.Mock;
  let mockSignFileByIdUrl: jest.Mock;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockFindOne = jest.fn();
    mockSignFileByIdUrl = jest
      .fn()
      .mockResolvedValue('https://example.com/file/agent-chat/signed');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeliverFileTool,
        {
          provide: getWorkspaceScopedRepositoryToken(FileEntity),
          useValue: { findOne: mockFindOne },
        },
        {
          provide: FileUrlService,
          useValue: { signFileByIdUrl: mockSignFileByIdUrl },
        },
      ],
    }).compile();

    tool = module.get(DeliverFileTool);
  });

  it('requires a fileId', async () => {
    const result = await tool.execute({}, { workspaceId: 'workspace-1' });

    expect(result.success).toBe(false);
    expect(result.message).toBe('deliver_file requires fileId');
  });

  it('returns not found when the file is missing', async () => {
    mockFindOne.mockResolvedValue(null);

    const result = await tool.execute(
      { fileId: FILE_ID },
      { workspaceId: 'workspace-1' },
    );

    expect(result.success).toBe(false);
    expect(result.message).toBe('File not found');
  });

  it('rejects files outside chat and Drive', async () => {
    mockFindOne.mockResolvedValue({
      id: FILE_ID,
      path: 'profile-picture/avatar.png',
      mimeType: 'image/png',
      size: 1200,
    });

    const result = await tool.execute(
      { fileId: FILE_ID },
      { workspaceId: 'workspace-1' },
    );

    expect(result.success).toBe(false);
    expect(result.message).toBe('File cannot be delivered');
    expect(mockSignFileByIdUrl).not.toHaveBeenCalled();
  });

  it('signs a chat file and strips the fileId prefix from the filename', async () => {
    mockFindOne.mockResolvedValue({
      id: FILE_ID,
      path: `agent-chat/image-generate/gen/${FILE_ID}-golden-retriever.png`,
      mimeType: 'image/png',
      size: 2048,
    });

    const result = await tool.execute(
      { fileId: FILE_ID },
      { workspaceId: 'workspace-1' },
    );

    expect(mockSignFileByIdUrl).toHaveBeenCalledWith({
      fileId: FILE_ID,
      workspaceId: 'workspace-1',
      fileFolder: FileFolder.AgentChat,
    });
    expect(result.success).toBe(true);
    expect(result.result).toEqual({
      fileId: FILE_ID,
      filename: 'golden-retriever.png',
      url: 'https://example.com/file/agent-chat/signed',
      mimeType: 'image/png',
      sizeBytes: 2048,
    });
  });
});
