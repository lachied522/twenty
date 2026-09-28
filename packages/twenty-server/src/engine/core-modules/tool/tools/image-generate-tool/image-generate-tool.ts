import { Injectable, Logger } from '@nestjs/common';

import path from 'path';

import { isAxiosError } from 'axios';
import { isNonEmptyString } from '@sniptt/guards';
import { FileFolder } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';
import { v4 } from 'uuid';

import { ApplicationService } from 'src/engine/core-modules/application/application.service';
import { FileStorageService } from 'src/engine/core-modules/file-storage/services/file-storage.service';
import { FileUrlService } from 'src/engine/core-modules/file/file-url/file-url.service';
import { FileService } from 'src/engine/core-modules/file/services/file.service';
import { SecureHttpClientService } from 'src/engine/core-modules/secure-http-client/secure-http-client.service';
import { OPENROUTER_IMAGES_API_URL } from 'src/engine/core-modules/tool/tools/image-generate-tool/constants/openrouter-images-api-url.const';
import { ImageGenerateInputZodSchema } from 'src/engine/core-modules/tool/tools/image-generate-tool/image-generate-tool.schema';
import { type GeneratedImageFile } from 'src/engine/core-modules/tool/tools/image-generate-tool/types/generated-image-file.type';
import { type ImageGenerateInput } from 'src/engine/core-modules/tool/tools/image-generate-tool/types/image-generate-input.type';
import { type OpenRouterImageResponse } from 'src/engine/core-modules/tool/tools/image-generate-tool/types/openrouter-image-response.type';
import { decodeOpenRouterImageData } from 'src/engine/core-modules/tool/tools/image-generate-tool/utils/decode-openrouter-image-data.util';
import { getImageGenerateModelId } from 'src/engine/core-modules/tool/tools/image-generate-tool/utils/get-image-generate-model-id.util';
import { sanitizeGeneratedImageFilename } from 'src/engine/core-modules/tool/tools/image-generate-tool/utils/sanitize-generated-image-filename.util';
import { type ToolExecutionContext } from 'src/engine/core-modules/tool/types/tool-execution-context.type';
import { type ToolInput } from 'src/engine/core-modules/tool/types/tool-input.type';
import { type ToolOutput } from 'src/engine/core-modules/tool/types/tool-output.type';
import { type Tool } from 'src/engine/core-modules/tool/types/tool.type';
import { TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { UsageOperationType } from 'src/engine/core-modules/usage/enums/usage-operation-type.enum';
import { AiBillingService } from 'src/engine/metadata-modules/ai/ai-billing/services/ai-billing.service';
import { streamToBuffer } from 'src/utils/stream-to-buffer';

const OPENROUTER_IMAGE_REQUEST_TIMEOUT_MS = 120_000;

const REFERENCE_IMAGE_FOLDERS = [FileFolder.AgentChat, FileFolder.Drive];

@Injectable()
export class ImageGenerateTool implements Tool {
  private readonly logger = new Logger(ImageGenerateTool.name);

  description =
    'Generate an image from a text prompt, or edit an existing chat image when referenceFileId is set. Returns a fileId you can pass to deliver_file, copy_file_to_drive, send_email, or code_interpreter. Do not claim the user can see the image until you call deliver_file.';

  inputSchema = ImageGenerateInputZodSchema;

  constructor(
    private readonly twentyConfigService: TwentyConfigService,
    private readonly secureHttpClientService: SecureHttpClientService,
    private readonly fileService: FileService,
    private readonly fileStorageService: FileStorageService,
    private readonly fileUrlService: FileUrlService,
    private readonly applicationService: ApplicationService,
    private readonly aiBillingService: AiBillingService,
  ) {}

  isConfigured(): boolean {
    return isNonEmptyString(this.twentyConfigService.get('OPENROUTER_API_KEY'));
  }

  async execute(
    parameters: ToolInput,
    context: ToolExecutionContext,
  ): Promise<ToolOutput<GeneratedImageFile>> {
    const parseResult = ImageGenerateInputZodSchema.safeParse(parameters);

    if (!parseResult.success) {
      return {
        success: false,
        message: 'Invalid input for image_generate',
        error: parseResult.error.issues
          .map(
            (issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`,
          )
          .join('; '),
      };
    }

    const apiKey = this.twentyConfigService.get('OPENROUTER_API_KEY');

    if (!isNonEmptyString(apiKey)) {
      return {
        success: false,
        message: 'Image generation is not configured',
        error: 'OPENROUTER_API_KEY is not set',
      };
    }

    const input = parseResult.data;
    const modelId = getImageGenerateModelId({
      modelId: context.modelId,
      aiModelTier: context.aiModelTier,
    });

    try {
      const imagePayload = await this.generateImage({
        apiKey,
        modelId,
        input,
        workspaceId: context.workspaceId,
      });

      const savedFile = await this.persistGeneratedImage({
        buffer: imagePayload.buffer,
        mimeType: imagePayload.mimeType,
        filename: input.filename,
        workspaceId: context.workspaceId,
      });

      await this.billUsage({
        modelId,
        usage: imagePayload.usage,
        workspaceId: context.workspaceId,
        userWorkspaceId: context.userWorkspaceId,
        usageOperationType: context.usageOperationType,
      });

      return {
        success: true,
        message: `Generated ${savedFile.filename}. Call deliver_file with this fileId to show it to the user.`,
        result: savedFile,
      };
    } catch (error) {
      const errorMessage = this.toErrorMessage(error);

      this.logger.error(
        `Image generation failed for model ${modelId}: ${errorMessage}`,
      );

      return {
        success: false,
        message: 'Image generation failed',
        error: errorMessage,
      };
    }
  }

  private async generateImage({
    apiKey,
    modelId,
    input,
    workspaceId,
  }: {
    apiKey: string;
    modelId: string;
    input: ImageGenerateInput;
    workspaceId: string;
  }): Promise<{
    buffer: Buffer;
    mimeType: string;
    usage?: OpenRouterImageResponse['usage'];
  }> {
    const inputReferences = isNonEmptyString(input.referenceFileId)
      ? [await this.buildReferenceImage(input.referenceFileId, workspaceId)]
      : undefined;

    const httpClient = this.secureHttpClientService.getHttpClient();
    const serverUrl = this.twentyConfigService.get('SERVER_URL');
    const response = await httpClient.post<OpenRouterImageResponse>(
      OPENROUTER_IMAGES_API_URL,
      {
        model: modelId,
        prompt: input.prompt,
        n: 1,
        ...(isDefined(inputReferences) && {
          input_references: inputReferences,
        }),
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          ...(isNonEmptyString(serverUrl) && {
            'HTTP-Referer': serverUrl,
            'X-Title': 'Twenty',
          }),
        },
        timeout: OPENROUTER_IMAGE_REQUEST_TIMEOUT_MS,
      },
    );

    if (isDefined(response.data.error?.message)) {
      throw new Error(response.data.error.message);
    }

    const decodedImage = decodeOpenRouterImageData(response.data);

    if (isDefined(decodedImage)) {
      return {
        ...decodedImage,
        usage: response.data.usage,
      };
    }

    const remoteUrl = response.data.data?.[0]?.url;

    if (isNonEmptyString(remoteUrl)) {
      const imageResponse = await httpClient.get<ArrayBuffer>(remoteUrl, {
        responseType: 'arraybuffer',
        timeout: OPENROUTER_IMAGE_REQUEST_TIMEOUT_MS,
      });

      const contentType = imageResponse.headers['content-type'];

      return {
        buffer: Buffer.from(imageResponse.data),
        mimeType:
          response.data.data?.[0]?.media_type ??
          (isNonEmptyString(contentType) ? contentType : 'image/png'),
        usage: response.data.usage,
      };
    }

    throw new Error('OpenRouter returned no image data');
  }

  private async buildReferenceImage(fileId: string, workspaceId: string) {
    const fileContent = await this.fileService.getFileStreamById({
      fileId,
      workspaceId,
      allowedFileFolders: REFERENCE_IMAGE_FOLDERS,
    });

    if (fileContent === null) {
      throw new Error(
        `Reference file ${fileId} was not found in this chat or Drive`,
      );
    }

    const buffer = await streamToBuffer(fileContent.stream);
    const mimeType = fileContent.mimeType || 'image/png';

    return {
      type: 'image_url',
      image_url: {
        url: `data:${mimeType};base64,${buffer.toString('base64')}`,
      },
    };
  }

  private async persistGeneratedImage({
    buffer,
    mimeType,
    filename,
    workspaceId,
  }: {
    buffer: Buffer;
    mimeType: string;
    filename?: string;
    workspaceId: string;
  }): Promise<GeneratedImageFile> {
    const sanitizedFilename = sanitizeGeneratedImageFilename({
      filename,
      mimeType,
    });
    const generationId = v4();
    const fileId = v4();
    const resourcePath = `image-generate/${generationId}/${fileId}-${sanitizedFilename}`;

    const { workspaceCustomFlatApplication } =
      await this.applicationService.findWorkspaceTwentyStandardAndCustomApplicationOrThrow(
        { workspaceId },
      );

    const savedFile = await this.fileStorageService.writeFile({
      sourceFile: buffer,
      fileFolder: FileFolder.AgentChat,
      applicationUniversalIdentifier:
        workspaceCustomFlatApplication.universalIdentifier,
      workspaceId,
      resourcePath,
      fileId,
      settings: {
        isTemporaryFile: false,
        toDelete: false,
      },
    });

    const signedUrl = await this.fileUrlService.signFileByIdUrl({
      fileId: savedFile.id,
      workspaceId,
      fileFolder: FileFolder.AgentChat,
    });

    return {
      fileId: savedFile.id,
      filename: path.basename(sanitizedFilename),
      url: signedUrl,
      mimeType: savedFile.mimeType || mimeType,
      sizeBytes: Number(savedFile.size),
    };
  }

  private async billUsage({
    modelId,
    usage,
    workspaceId,
    userWorkspaceId,
    usageOperationType,
  }: {
    modelId: string;
    usage?: OpenRouterImageResponse['usage'];
    workspaceId: string;
    userWorkspaceId?: string;
    usageOperationType?: UsageOperationType;
  }): Promise<void> {
    const costInDollars = usage?.cost ?? 0;
    const totalTokens = usage?.total_tokens ?? 0;

    if (costInDollars <= 0 && totalTokens <= 0) {
      return;
    }

    await this.aiBillingService.billExternalUsage({
      modelId: `openrouter/${modelId}`,
      costInDollars,
      quantity: totalTokens,
      workspaceId,
      operationType: usageOperationType ?? UsageOperationType.AI_CHAT_TOKEN,
      userWorkspaceId,
    });
  }

  private toErrorMessage(error: unknown): string {
    if (isAxiosError(error)) {
      const responseMessage = error.response?.data?.error?.message;

      if (isNonEmptyString(responseMessage)) {
        return responseMessage;
      }

      return error.message;
    }

    return error instanceof Error ? error.message : String(error);
  }
}
