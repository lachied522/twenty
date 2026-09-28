import { type AiModelTier } from 'twenty-shared/ai';

export const IMAGE_GENERATE_FLASH_MODEL_ID = 'google/gemini-2.5-flash-image';

export const IMAGE_GENERATE_SUNBURST_MODEL_ID = 'openai/gpt-image-2.5-sunburst';

export const IMAGE_GENERATE_MODEL_ID_BY_TIER: Record<AiModelTier, string> = {
  extraFast: IMAGE_GENERATE_FLASH_MODEL_ID,
  fast: IMAGE_GENERATE_FLASH_MODEL_ID,
  balanced: IMAGE_GENERATE_FLASH_MODEL_ID,
  smart: IMAGE_GENERATE_SUNBURST_MODEL_ID,
  extraSmart: IMAGE_GENERATE_SUNBURST_MODEL_ID,
};
