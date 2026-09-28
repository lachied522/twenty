import { type AiModelTier, getAiModelTierFromModelId } from 'twenty-shared/ai';

import { IMAGE_GENERATE_MODEL_ID_BY_TIER } from 'src/engine/core-modules/tool/tools/image-generate-tool/constants/image-generate-model-id-by-tier.const';

const DEFAULT_IMAGE_GENERATE_TIER: AiModelTier = 'balanced';

export const getImageGenerateModelId = ({
  modelId,
  aiModelTier,
}: {
  modelId?: string;
  aiModelTier?: AiModelTier;
}): string => {
  const resolvedTier =
    getAiModelTierFromModelId(modelId) ??
    aiModelTier ??
    DEFAULT_IMAGE_GENERATE_TIER;

  return IMAGE_GENERATE_MODEL_ID_BY_TIER[resolvedTier];
};
