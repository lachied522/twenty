import { z } from 'zod';

export const ImageGenerateInputZodSchema = z.object({
  prompt: z
    .string()
    .min(1)
    .describe('Description of the image to generate or of the requested edit.'),
  referenceFileId: z
    .string()
    .uuid()
    .optional()
    .describe(
      'Optional chat fileId of an existing image to edit instead of generating from scratch.',
    ),
  filename: z
    .string()
    .optional()
    .describe(
      'Optional filename for the generated image, e.g. golden-retriever-puppy.png.',
    ),
});
