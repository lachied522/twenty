import { isDeliverFileToolPart } from '@/ai/utils/isDeliverFileToolPart';
import { type ExtendedUIMessagePart } from 'twenty-shared/ai';

describe('isDeliverFileToolPart', () => {
  it('matches a native deliver_file tool part', () => {
    expect(
      isDeliverFileToolPart({
        type: 'tool-deliver_file',
        toolCallId: 'call-1',
        input: { fileId: '1f0c8d2e-3b4a-4c5d-8e6f-7a8b9c0d1e2f' },
        state: 'output-available',
      } as ExtendedUIMessagePart),
    ).toBe(true);
  });

  it('matches execute_tool wrapping deliver_file', () => {
    expect(
      isDeliverFileToolPart({
        type: 'tool-execute_tool',
        toolCallId: 'call-2',
        input: {
          toolName: 'deliver_file',
          arguments: { fileId: '1f0c8d2e-3b4a-4c5d-8e6f-7a8b9c0d1e2f' },
        },
        state: 'output-available',
      } as ExtendedUIMessagePart),
    ).toBe(true);
  });

  it('does not match other tools', () => {
    expect(
      isDeliverFileToolPart({
        type: 'tool-image_generate',
        toolCallId: 'call-3',
        input: { prompt: 'A puppy' },
        state: 'output-available',
      } as ExtendedUIMessagePart),
    ).toBe(false);
    expect(
      isDeliverFileToolPart({
        type: 'tool-execute_tool',
        toolCallId: 'call-4',
        input: {
          toolName: 'image_generate',
          arguments: { prompt: 'A puppy' },
        },
        state: 'output-available',
      } as ExtendedUIMessagePart),
    ).toBe(false);
  });
});
