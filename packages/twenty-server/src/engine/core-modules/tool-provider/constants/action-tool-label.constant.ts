import { msg } from '@lingui/core/macro';

import { type ActionToolLabel } from 'src/engine/core-modules/tool-provider/types/action-tool-label.type';
import { i18nLabel } from 'src/engine/workspace-manager/twenty-standard-application/utils/i18n-label.util';

export const ACTION_TOOL_IDS = [
  'http_request',
  'send_email',
  'draft_email',
  'find_connected_accounts',
  'create_calendar_event',
  'search_help_center',
  'code_interpreter',
  'navigate_app',
  'save_campaign',
  'create_file_upload',
  'complete_file_upload',
  'list_drive_spaces',
  'list_drive_items',
  'read_drive_file',
  'copy_file_to_drive',
  'share_drive_item',
] as const;

export type ActionToolId = (typeof ACTION_TOOL_IDS)[number];

export const ACTION_TOOL_LABELS: Record<ActionToolId, ActionToolLabel> = {
  http_request: {
    label: i18nLabel(msg`HTTP Request`),
  },
  send_email: {
    label: i18nLabel(msg`Send Email`),
  },
  draft_email: {
    label: i18nLabel(msg`Draft Email`),
  },
  find_connected_accounts: {
    label: i18nLabel(msg`Find Connected Accounts`),
  },
  create_calendar_event: {
    label: i18nLabel(msg`Create Calendar Event`),
  },
  search_help_center: {
    label: i18nLabel(msg`Search Help Center`),
  },
  code_interpreter: {
    label: i18nLabel(msg`Code Interpreter`),
  },
  navigate_app: {
    label: i18nLabel(msg`Navigate App`),
  },
  save_campaign: {
    label: i18nLabel(msg`Save Campaign`),
  },
  create_file_upload: {
    label: i18nLabel(msg`Create File Upload`),
  },
  complete_file_upload: {
    label: i18nLabel(msg`Complete File Upload`),
  },
  list_drive_spaces: {
    label: i18nLabel(msg`List Drive Spaces`),
  },
  list_drive_items: {
    label: i18nLabel(msg`List Drive Items`),
  },
  read_drive_file: {
    label: i18nLabel(msg`Read Drive File`),
  },
  copy_file_to_drive: {
    label: i18nLabel(msg`Copy File To Drive`),
  },
  share_drive_item: {
    label: i18nLabel(msg`Share Drive Item`),
  },
};
