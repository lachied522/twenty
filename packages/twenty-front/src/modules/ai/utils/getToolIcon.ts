import {
  IconBook2,
  IconDatabase,
  IconDownload,
  IconMail,
  IconPhoto,
  IconTool,
  IconWorld,
} from 'twenty-ui/icon';

const TOOL_ICON_MAPPINGS = [
  {
    keywords: ['learn_tools'],
    icon: IconBook2,
  },
  {
    keywords: ['image_generate'],
    icon: IconPhoto,
  },
  {
    keywords: ['deliver_file'],
    icon: IconDownload,
  },
  {
    keywords: ['email'],
    icon: IconMail,
  },
  {
    keywords: ['http_request'],
    icon: IconWorld,
  },
  {
    keywords: ['create_', 'update_', 'find_', 'delete_'],
    icon: IconDatabase,
  },
  {
    keywords: ['workflow', 'handoff'],
    icon: IconTool,
  },
] as const;

export const getToolIcon = (toolName: string) => {
  const mapping = TOOL_ICON_MAPPINGS.find(({ keywords }) =>
    keywords.some((keyword) => toolName.includes(keyword)),
  );

  return mapping?.icon ?? IconTool;
};
