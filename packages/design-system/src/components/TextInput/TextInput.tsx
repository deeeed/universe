import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import {
  NativeSyntheticEvent,
  TextInput as RNTextInput,
  StyleSheet,
  TextInputFocusEventData,
} from 'react-native';
import { TextInput as GHTextInput } from 'react-native-gesture-handler';
import {
  TextInput as PTextInput,
  TextInputProps as PTextInputProps,
  Text,
} from 'react-native-paper';
import { AppTheme } from '../../hooks/_useAppThemeSetup';
import { useTheme } from '../../providers/ThemeProvider';

export interface TextInputProps extends PTextInputProps {
  mandatory?: boolean;
  withinBottomSheet?: boolean;
}

export interface InputRefMethods {
  focus: () => void;
  blur: () => void;
}

const getStyles = ({ theme }: { theme: AppTheme }) =>
  StyleSheet.create({
    bottomSheetInput: {
      fontSize: 16,
      color: theme.colors.text,
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: theme.colors.background,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.surfaceDisabled,
      minHeight: 48, // Ensure a minimum height
      width: '100%',
      borderWidth: 1,
    },
  });

export const TextInput = forwardRef<InputRefMethods, TextInputProps>(
  ({ mandatory, label, withinBottomSheet, onFocus, onBlur, ...rest }, ref) => {
    const theme = useTheme();
    const styles = useMemo(() => getStyles({ theme }), [theme]);
    const inputRef = useRef<RNTextInput>(null);
    const bottomSheetInputRef = useRef<GHTextInput>(null);

    useImperativeHandle(ref, () => ({
      focus: () => {
        if (withinBottomSheet) {
          bottomSheetInputRef.current?.focus();
        } else {
          inputRef.current?.focus();
        }
      },
      blur: () => {
        if (withinBottomSheet) {
          bottomSheetInputRef.current?.blur();
        } else {
          inputRef.current?.blur();
        }
      },
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

    const handleFocus = useCallback(
      (event: NativeSyntheticEvent<TextInputFocusEventData>) => {
        onFocus?.(event);
      },
      [onFocus]
    );

    const handleBlur = useCallback(
      (event: NativeSyntheticEvent<TextInputFocusEventData>) => {
        onBlur?.(event);
      },
      [onBlur]
    );

    if (withinBottomSheet) {
      return (
        <BottomSheetTextInput
          {...rest}
          ref={bottomSheetInputRef}
          style={styles.bottomSheetInput}
          placeholder={label as string}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
      );
    }

    return (
      <PTextInput
        {...rest}
        ref={inputRef}
        label={renderLabel()}
        onFocus={handleFocus}
        onBlur={handleBlur}
      />
    );
  }
);

TextInput.displayName = 'TextInput';
