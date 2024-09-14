// TextInput.tsx

import { useBottomSheetInternal } from '@gorhom/bottom-sheet';
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';
import {
  NativeSyntheticEvent,
  TextInput as RNTextInput,
  TextInputFocusEventData,
} from 'react-native';
import {
  TextInput as PTextInput,
  TextInputProps as PTextInputProps,
  Text,
} from 'react-native-paper';

export interface TextInputProps extends PTextInputProps {
  mandatory?: boolean;
}

export interface InputRefMethods {
  focus: () => void;
  blur: () => void;
}

const useSafeBottomSheetInternal = () => {
  try {
    return useBottomSheetInternal();
  } catch (e) {
    return null;
  }
};

export const TextInput = forwardRef<InputRefMethods, TextInputProps>(
  ({ mandatory, label, onFocus, onBlur, ...rest }, ref) => {
    const inputRef = useRef<RNTextInput>(null);
    const bottomSheetInternal = useSafeBottomSheetInternal();

    useImperativeHandle(ref, () => ({
      focus: () => inputRef.current?.focus(),
      blur: () => inputRef.current?.blur(),
    }));

    const renderLabel = () => {
      if (mandatory) {
        return (
          <Text>
            {label}
            <Text style={{ color: 'red', paddingLeft: 5 }}>*</Text>
          </Text>
        );
      }
      return label;
    };

    const handleOnFocus = useCallback(
      (event: NativeSyntheticEvent<TextInputFocusEventData>) => {
        if (bottomSheetInternal) {
          bottomSheetInternal.shouldHandleKeyboardEvents.value = true;
        }
        onFocus?.(event);
      },
      [onFocus, bottomSheetInternal]
    );

    const handleOnBlur = useCallback(
      (event: NativeSyntheticEvent<TextInputFocusEventData>) => {
        if (bottomSheetInternal) {
          bottomSheetInternal.shouldHandleKeyboardEvents.value = false;
        }
        onBlur?.(event);
      },
      [onBlur, bottomSheetInternal]
    );

    useEffect(() => {
      return () => {
        if (bottomSheetInternal) {
          bottomSheetInternal.shouldHandleKeyboardEvents.value = false;
        }
      };
    }, [bottomSheetInternal]);

    return (
      <PTextInput
        {...rest}
        ref={inputRef}
        label={renderLabel()}
        onFocus={handleOnFocus}
        onBlur={handleOnBlur}
      />
    );
  }
);

TextInput.displayName = 'TextInput';
