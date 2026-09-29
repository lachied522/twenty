export type ChatMemoryCreateAction = {
  type: 'create';
  content: string;
};

export type ChatMemoryUpdateAction = {
  type: 'update';
  id: string;
  content: string;
};

export type ChatMemoryDeleteAction = {
  type: 'delete';
  id: string;
};

export type ChatMemoryAction =
  | ChatMemoryCreateAction
  | ChatMemoryUpdateAction
  | ChatMemoryDeleteAction;
