import React, { forwardRef, useRef, useImperativeHandle } from 'react';
import {
  TextInput as PTextInput,
  TextInputProps as PTextInputProps,
  Text,
} from 'react-native-paper';
import { TextInput as RNTextInput } from 'react-native';
import { TextInput as GestureHandlerTextInput } from 'react-native-gesture-handler';
import { useTheme } from '../../providers/ThemeProvider';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';

export interface TextInputProps extends PTextInputProps {
  mandatory?: boolean;
  withinBottomSheet?: boolean;
}

type InputRef = RNTextInput | GestureHandlerTextInput;

export const TextInput = forwardRef<InputRef, TextInputProps>(
  ({ mandatory, label, withinBottomSheet, ...rest }, ref) => {
    const { colors } = useTheme();
    const inputRef = useRef<InputRef>(null);

    useImperativeHandle(ref, () => inputRef.current!);

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

    if (withinBottomSheet) {
      return (
        <PTextInput
          {...rest}
          render={(props) => (
            <BottomSheetTextInput
              {...props}
              ref={inputRef as React.Ref<GestureHandlerTextInput>}
              style={[{ color: colors.text }, props.style, rest.style]}
            />
          )}
          label={renderLabel()}
        />
      );
    }

    return (
      <PTextInput
        {...rest}
        ref={ref as React.Ref<RNTextInput>}
        style={[{ color: colors.text }, rest.style]}
        label={renderLabel()}
      />
    );
  }
);

TextInput.displayName = 'TextInput';
