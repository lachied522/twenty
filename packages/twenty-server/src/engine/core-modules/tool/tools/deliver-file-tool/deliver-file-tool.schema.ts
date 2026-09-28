import { z } from 'zod';

export const DeliverFileInputZodSchema = z.object({
  fileId: z
    .string()
    .uuid()
    .describe(
      'fileId of a file already in this chat (from image_generate, code_interpreter, or a user upload) to show the user.',
    ),
});
