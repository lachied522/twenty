import { fireEvent, render, screen } from '@testing-library/react';
import { createStore, Provider as JotaiProvider } from 'jotai';

import { TextInput } from '@/ui/input/components/TextInput';
import { focusStackState } from '@/ui/utilities/focus/states/focusStackState';
import { FocusComponentType } from '@/ui/utilities/focus/types/FocusComponentType';

describe('TextInput', () => {
  it('suppresses keyboard-conflicting hotkeys while focused and restores them on blur', () => {
    const store = createStore();
    const onFocus = jest.fn();
    const onBlur = jest.fn();

    render(
      <JotaiProvider store={store}>
        <TextInput label="Title" value="" onFocus={onFocus} onBlur={onBlur} />
      </JotaiProvider>,
    );

    const textInput = screen.getByRole('textbox', { name: 'Title' });

    fireEvent.focus(textInput);

    expect(onFocus).toHaveBeenCalledTimes(1);
    expect(store.get(focusStackState.atom).at(-1)).toMatchObject({
      componentInstance: {
        componentType: FocusComponentType.TEXT_INPUT,
      },
      globalHotkeysConfig: {
        enableGlobalHotkeysConflictingWithKeyboard: false,
      },
    });

    fireEvent.blur(textInput);

    expect(onBlur).toHaveBeenCalledTimes(1);
    expect(store.get(focusStackState.atom)).toEqual([]);
  });

  it('keeps a caller focus item above the text input item', () => {
    const store = createStore();

    render(
      <JotaiProvider store={store}>
        <TextInput
          label="Title"
          value=""
          onFocus={() => {
            store.set(focusStackState.atom, [
              ...store.get(focusStackState.atom),
              {
                focusId: 'caller-focus-id',
                componentInstance: {
                  componentType: FocusComponentType.TEXT_INPUT,
                  componentInstanceId: 'caller-focus-id',
                },
                globalHotkeysConfig: {
                  enableGlobalHotkeysWithModifiers: true,
                  enableGlobalHotkeysConflictingWithKeyboard: false,
                },
              },
            ]);
          }}
        />
      </JotaiProvider>,
    );

    fireEvent.focus(screen.getByRole('textbox', { name: 'Title' }));

    expect(store.get(focusStackState.atom).at(-1)?.focusId).toBe(
      'caller-focus-id',
    );
  });
});
