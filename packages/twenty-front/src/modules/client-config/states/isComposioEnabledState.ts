import { createAtomState } from '@/ui/utilities/state/jotai/utils/createAtomState';

export const isComposioEnabledState = createAtomState<boolean>({
  key: 'isComposioEnabledState',
  defaultValue: false,
});
