// TextInput.tsx

import { useBottomSheetInternal } from '@gorhom/bottom-sheet';
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {
  type BlurEvent,
  type FocusEvent,
  Platform,
  TextInput as RNTextInput,
} from 'react-native';
import {
  TextInput as PTextInput,
  TextInputProps as PTextInputProps,
  Text,
} from 'react-native-paper';

export interface TextInputProps extends PTextInputProps {
  mandatory?: boolean;
  testID?: string;
}

export interface InputRefMethods {
  focus: () => void;
  blur: () => void;
}

const useSafeBottomSheetInternal = () => {
  try {
    return useBottomSheetInternal();
  } catch {
    return null;
  }
};
const isWeb = Platform.OS === 'web';

export const TextInput = forwardRef<InputRefMethods, TextInputProps>(
  ({ mandatory, label, onFocus, onBlur, autoFocus, testID, ...rest }, ref) => {
    const inputRef = useRef<RNTextInput>(null);
    const bottomSheetInternal = useSafeBottomSheetInternal();
    const [shouldFocus, setShouldFocus] = useState(!isWeb);

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
      (event: FocusEvent) => {
        if (bottomSheetInternal && !isWeb) {
          const target = event.nativeEvent.target;
          bottomSheetInternal.textInputNodesRef.current.add(target);
          bottomSheetInternal.animatedKeyboardState.set((state) => ({
            ...state,
            target,
          }));
        }
        onFocus?.(event);
      },
      [onFocus, bottomSheetInternal]
    );

    const handleOnBlur = useCallback(
      (event: BlurEvent) => {
        if (bottomSheetInternal && !isWeb) {
          const target = event.nativeEvent.target;
          bottomSheetInternal.textInputNodesRef.current.delete(target);
          const keyboardState = bottomSheetInternal.animatedKeyboardState.get();
          if (keyboardState.target === target) {
            bottomSheetInternal.animatedKeyboardState.set((state) => ({
              ...state,
              target: undefined,
            }));
          }
        }
        onBlur?.(event);
      },
      [onBlur, bottomSheetInternal]
    );

    useEffect(() => {
      if (isWeb && autoFocus) {
        const timer = setTimeout(() => {
          setShouldFocus(true);
          inputRef.current?.focus();
        }, 300);
        return () => clearTimeout(timer);
      }

      return;
    }, [autoFocus]);

    useEffect(() => {
      if (isWeb || !bottomSheetInternal) return;
      return () => {
        const keyboardState = bottomSheetInternal.animatedKeyboardState.get();
        if (keyboardState.target != null) {
          bottomSheetInternal.textInputNodesRef.current.delete(
            keyboardState.target
          );
          bottomSheetInternal.animatedKeyboardState.set((state) => ({
            ...state,
            target: undefined,
          }));
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
        autoFocus={isWeb ? shouldFocus && autoFocus : autoFocus}
        testID={testID}
      />
    );
  }
);

TextInput.displayName = 'TextInput';
