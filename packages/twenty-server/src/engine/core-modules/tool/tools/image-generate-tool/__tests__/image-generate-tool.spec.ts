import { FileFolder } from 'twenty-shared/types';
import { Test, type TestingModule } from '@nestjs/testing';
import { Readable } from 'stream';

import { ApplicationService } from 'src/engine/core-modules/application/application.service';
import { FileStorageService } from 'src/engine/core-modules/file-storage/services/file-storage.service';
import { FileUrlService } from 'src/engine/core-modules/file/file-url/file-url.service';
import { FileService } from 'src/engine/core-modules/file/services/file.service';
import { SecureHttpClientService } from 'src/engine/core-modules/secure-http-client/secure-http-client.service';
import {
  IMAGE_GENERATE_FLASH_MODEL_ID,
  IMAGE_GENERATE_SUNBURST_MODEL_ID,
} from 'src/engine/core-modules/tool/tools/image-generate-tool/constants/image-generate-model-id-by-tier.const';
import { OPENROUTER_IMAGES_API_URL } from 'src/engine/core-modules/tool/tools/image-generate-tool/constants/openrouter-images-api-url.const';
import { ImageGenerateTool } from 'src/engine/core-modules/tool/tools/image-generate-tool/image-generate-tool';
import { TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { UsageOperationType } from 'src/engine/core-modules/usage/enums/usage-operation-type.enum';
import { AiBillingService } from 'src/engine/metadata-modules/ai/ai-billing/services/ai-billing.service';

const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const REFERENCE_FILE_ID = '62c5bf6b-6a56-4199-ba04-69da359e13c3';
const SAVED_FILE_ID = '1f0c8d2e-3b4a-4c5d-8e6f-7a8b9c0d1e2f';

describe('ImageGenerateTool', () => {
  let tool: ImageGenerateTool;
  let mockGet: jest.Mock;
  let mockPost: jest.Mock;
  let mockGetFileStreamById: jest.Mock;
  let mockWriteFile: jest.Mock;
  let mockSignFileByIdUrl: jest.Mock;
  let mockBillExternalUsage: jest.Mock;
  let mockConfigGet: jest.Mock;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockGet = jest.fn();
    mockPost = jest.fn().mockResolvedValue({
      data: {
        data: [{ b64_json: PNG_BASE64, media_type: 'image/png' }],
        usage: { total_tokens: 4175, cost: 0.04 },
      },
    });
    mockGetFileStreamById = jest.fn();
    mockWriteFile = jest.fn().mockResolvedValue({
      id: SAVED_FILE_ID,
      mimeType: 'image/png',
      size: 70,
    });
    mockSignFileByIdUrl = jest
      .fn()
      .mockResolvedValue('https://example.com/file/agent-chat/signed');
    mockBillExternalUsage = jest.fn().mockResolvedValue(undefined);
    mockConfigGet = jest.fn((key: string) => {
      if (key === 'OPENROUTER_API_KEY') {
        return 'test-openrouter-key';
      }

      if (key === 'SERVER_URL') {
        return 'https://app.example.com';
      }

      return undefined;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImageGenerateTool,
        {
          provide: TwentyConfigService,
          useValue: { get: mockConfigGet },
        },
        {
          provide: SecureHttpClientService,
          useValue: {
            getHttpClient: () => ({ post: mockPost, get: mockGet }),
          },
        },
        {
          provide: FileService,
          useValue: { getFileStreamById: mockGetFileStreamById },
        },
        {
          provide: FileStorageService,
          useValue: { writeFile: mockWriteFile },
        },
        {
          provide: FileUrlService,
          useValue: { signFileByIdUrl: mockSignFileByIdUrl },
        },
        {
          provide: ApplicationService,
          useValue: {
            findWorkspaceTwentyStandardAndCustomApplicationOrThrow: jest
              .fn()
              .mockResolvedValue({
                workspaceCustomFlatApplication: {
                  universalIdentifier: 'app-universal-id',
                },
              }),
          },
        },
        {
          provide: AiBillingService,
          useValue: { billExternalUsage: mockBillExternalUsage },
        },
      ],
    }).compile();

    tool = module.get(ImageGenerateTool);
  });

  it('is configured when an OpenRouter key is present', () => {
    expect(tool.isConfigured()).toBe(true);
  });

  it('rejects invalid input', async () => {
    const result = await tool.execute(
      { prompt: '' },
      { workspaceId: 'workspace-1' },
    );

    expect(result.success).toBe(false);
    expect(result.message).toBe('Invalid input for image_generate');
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('returns an error when OpenRouter is not configured', async () => {
    mockConfigGet.mockImplementation((key: string) =>
      key === 'OPENROUTER_API_KEY' ? '' : 'https://app.example.com',
    );

    const result = await tool.execute(
      { prompt: 'A golden retriever puppy' },
      { workspaceId: 'workspace-1' },
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe('OPENROUTER_API_KEY is not set');
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('persists a generated image, bills usage, and uses Flash for balanced chat', async () => {
    const result = await tool.execute(
      {
        prompt: 'A golden retriever puppy',
        filename: 'golden-retriever-puppy',
      },
      {
        workspaceId: 'workspace-1',
        userWorkspaceId: 'user-workspace-1',
        modelId: 'default-balanced-model',
        usageOperationType: UsageOperationType.AI_CHAT_TOKEN,
      },
    );

    expect(mockPost).toHaveBeenCalledWith(
      OPENROUTER_IMAGES_API_URL,
      expect.objectContaining({
        model: IMAGE_GENERATE_FLASH_MODEL_ID,
        prompt: 'A golden retriever puppy',
        n: 1,
      }),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-openrouter-key',
        }),
      }),
    );
    expect(mockWriteFile).toHaveBeenCalledWith(
      expect.objectContaining({
        fileFolder: FileFolder.AgentChat,
        resourcePath: expect.stringMatching(
          /^image-generate\/.+\/.+-golden-retriever-puppy\.png$/,
        ),
      }),
    );
    expect(mockBillExternalUsage).toHaveBeenCalledWith({
      modelId: `openrouter/${IMAGE_GENERATE_FLASH_MODEL_ID}`,
      costInDollars: 0.04,
      quantity: 4175,
      workspaceId: 'workspace-1',
      operationType: UsageOperationType.AI_CHAT_TOKEN,
      userWorkspaceId: 'user-workspace-1',
    });
    expect(result.success).toBe(true);
    expect(result.result).toMatchObject({
      fileId: SAVED_FILE_ID,
      filename: 'golden-retriever-puppy.png',
      mimeType: 'image/png',
      sizeBytes: 70,
    });
  });

  it('uses Sunburst for Extra Smart chat and sends a reference image', async () => {
    mockGetFileStreamById.mockResolvedValue({
      stream: Readable.from(Buffer.from('reference-bytes')),
      mimeType: 'image/png',
    });

    const result = await tool.execute(
      {
        prompt: 'Make the puppy wear a red hat',
        referenceFileId: REFERENCE_FILE_ID,
      },
      {
        workspaceId: 'workspace-1',
        modelId: 'default-extra-smart-model',
      },
    );

    expect(result.success).toBe(true);
    expect(mockPost).toHaveBeenCalledWith(
      OPENROUTER_IMAGES_API_URL,
      expect.objectContaining({
        model: IMAGE_GENERATE_SUNBURST_MODEL_ID,
        input_references: [
          {
            type: 'image_url',
            image_url: {
              url: expect.stringMatching(/^data:image\/png;base64,/),
            },
          },
        ],
      }),
      expect.any(Object),
    );
  });

  it('fails when the reference file cannot be loaded', async () => {
    mockGetFileStreamById.mockResolvedValue(null);

    const result = await tool.execute(
      {
        prompt: 'Edit this photo',
        referenceFileId: REFERENCE_FILE_ID,
      },
      { workspaceId: 'workspace-1' },
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain(REFERENCE_FILE_ID);
    expect(mockWriteFile).not.toHaveBeenCalled();
    expect(mockBillExternalUsage).not.toHaveBeenCalled();
  });
});
