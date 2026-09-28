import { type z } from 'zod';

import { type ImageGenerateInputZodSchema } from 'src/engine/core-modules/tool/tools/image-generate-tool/image-generate-tool.schema';

export type ImageGenerateInput = z.infer<typeof ImageGenerateInputZodSchema>;
