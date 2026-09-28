import {
  IMAGE_GENERATE_FLASH_MODEL_ID,
  IMAGE_GENERATE_SUNBURST_MODEL_ID,
} from 'src/engine/core-modules/tool/tools/image-generate-tool/constants/image-generate-model-id-by-tier.const';
import { getImageGenerateModelId } from 'src/engine/core-modules/tool/tools/image-generate-tool/utils/get-image-generate-model-id.util';

describe('getImageGenerateModelId', () => {
  it('uses Gemini Flash Image for balanced and below', () => {
    expect(
      getImageGenerateModelId({ modelId: 'default-extra-fast-model' }),
    ).toBe(IMAGE_GENERATE_FLASH_MODEL_ID);
    expect(getImageGenerateModelId({ modelId: 'default-fast-model' })).toBe(
      IMAGE_GENERATE_FLASH_MODEL_ID,
    );
    expect(getImageGenerateModelId({ modelId: 'default-balanced-model' })).toBe(
      IMAGE_GENERATE_FLASH_MODEL_ID,
    );
  });

  it('uses GPT Image Sunburst for smart and above', () => {
    expect(getImageGenerateModelId({ modelId: 'default-smart-model' })).toBe(
      IMAGE_GENERATE_SUNBURST_MODEL_ID,
    );
    expect(
      getImageGenerateModelId({ modelId: 'default-extra-smart-model' }),
    ).toBe(IMAGE_GENERATE_SUNBURST_MODEL_ID);
  });

  it('falls back to the explicit chat tier when the model id is concrete', () => {
    expect(
      getImageGenerateModelId({
        modelId: 'openrouter/openai/gpt-5.6-luna',
        aiModelTier: 'extraSmart',
      }),
    ).toBe(IMAGE_GENERATE_SUNBURST_MODEL_ID);
  });

  it('defaults to balanced when no tier can be resolved', () => {
    expect(getImageGenerateModelId({})).toBe(IMAGE_GENERATE_FLASH_MODEL_ID);
  });
});
