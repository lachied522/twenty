import { type DeliveredFile } from '@/ai/utils/getDeliveredFileFromToolOutput';

// Keyed by the delivering tool call rather than fileId so each delivery
// registers and unregisters independently
export type AiChatFile = DeliveredFile & {
  id: string;
  deliveredAt: string;
};
