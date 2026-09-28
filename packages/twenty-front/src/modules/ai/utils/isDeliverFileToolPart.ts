import { isToolUIPart } from 'ai';
import { type ExtendedUIMessagePart } from 'twenty-shared/ai';

export const isDeliverFileToolPart = (part: ExtendedUIMessagePart): boolean => {
  if (!isToolUIPart(part)) {
    return false;
  }

  if (part.type === 'tool-deliver_file') {
    return true;
  }

  if (part.type === 'tool-execute_tool') {
    const input = part.input as Record<string, unknown> | null | undefined;

    return input?.toolName === 'deliver_file';
  }

  return false;
};
