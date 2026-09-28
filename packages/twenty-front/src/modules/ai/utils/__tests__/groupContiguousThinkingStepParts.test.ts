import { type ExtendedUIMessagePart } from 'twenty-shared/ai';

import { groupContiguousThinkingStepParts } from '@/ai/utils/groupContiguousThinkingStepParts';

describe('groupContiguousThinkingStepParts', () => {
  it('keeps deliver_file out of thinking so the preview card can render', () => {
    const parts = [
      {
        type: 'reasoning',
        text: 'I will generate then deliver',
        state: 'done',
      },
      {
        type: 'tool-execute_tool',
        toolCallId: 'generate-1',
        input: {
          toolName: 'image_generate',
          arguments: { prompt: 'A golden retriever puppy' },
        },
        output: { result: { fileId: 'file-1' } },
        state: 'output-available',
      },
      {
        type: 'tool-execute_tool',
        toolCallId: 'deliver-1',
        input: {
          toolName: 'deliver_file',
          arguments: { fileId: 'file-1' },
        },
        output: {
          result: {
            fileId: 'file-1',
            filename: 'golden-retriever.png',
            url: 'https://example.com/file.png',
            mimeType: 'image/png',
          },
        },
        state: 'output-available',
      },
      {
        type: 'text',
        text: 'Here is your image.',
      },
    ] as ExtendedUIMessagePart[];

    const renderItems = groupContiguousThinkingStepParts(parts);

    expect(renderItems).toHaveLength(3);
    expect(renderItems[0]).toMatchObject({
      type: 'thinking-steps',
    });
    if (renderItems[0].type === 'thinking-steps') {
      expect(renderItems[0].parts).toHaveLength(2);
    }
    expect(renderItems[1]).toMatchObject({
      type: 'part',
      part: { toolCallId: 'deliver-1' },
    });
    expect(renderItems[2]).toMatchObject({
      type: 'part',
      part: { type: 'text' },
    });
  });
});
