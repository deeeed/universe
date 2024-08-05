import React, { forwardRef, Ref } from 'react';
import {
  TextInput as PTextInput,
  TextInputProps as PTextInputProps,
  Text,
} from 'react-native-paper';
import { TextInput as RNTextInput } from 'react-native';
import { useTheme } from '../../providers/ThemeProvider';

export interface TextInputProps extends PTextInputProps {
  mandatory?: boolean;
}

export const TextInput = forwardRef<RNTextInput, TextInputProps>(
  ({ mandatory, label, ...rest }, ref) => {
    const { colors } = useTheme();

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

    return (
      <PTextInput
        {...rest}
        ref={ref as Ref<RNTextInput>}
        style={[{ color: colors.text }, rest.style]}
        label={renderLabel()}
      />
    );
  }
);

TextInput.displayName = 'TextInput';
