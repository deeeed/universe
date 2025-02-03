import React, { useState } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Button } from '../Button/Button';
import { TextInput } from '../TextInput/TextInput';

const getStyles = () => {
  return StyleSheet.create({
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10,
      gap: 5,
    },
    input: {
      flex: 1,
    },
    buttonContainer: {
      flexDirection: 'row',
      gap: 5,
    },
  });
};

export interface NumberAdjusterProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<ViewStyle>;
  buttonStyle?: StyleProp<ViewStyle>;
  buttonContainerStyle?: StyleProp<ViewStyle>;
  textInputProps?: Partial<React.ComponentProps<typeof TextInput>>;
}

export const NumberAdjuster: React.FC<NumberAdjusterProps> = ({
  label,
  value,
  onChange,
  min = 1,
  max = Infinity,
  step = 1,
  containerStyle,
  inputStyle,
  buttonStyle,
  buttonContainerStyle,
  textInputProps,
}) => {
  const styles = getStyles();
  const [localValue, setLocalValue] = useState(value.toString());

  const handleIncrement = () => {
    const newValue = Math.min(value + step, max);
    onChange(newValue);
    setLocalValue(newValue.toString());
  };

  const handleDecrement = () => {
    const newValue = Math.max(value - step, min);
    onChange(newValue);
    setLocalValue(newValue.toString());
  };

  const handleChangeText = (text: string) => {
    setLocalValue(text);
  };

  const handleFinishEditing = () => {
    const newValue = parseInt(localValue, 10);
    if (!isNaN(newValue)) {
      const boundedValue = Math.max(Math.min(newValue, max), min);
      onChange(boundedValue);
      setLocalValue(boundedValue.toString());
    } else {
      setLocalValue(value.toString());
    }
  };

  return (
    <View style={[styles.inputRow, containerStyle]}>
      <TextInput
        label={label}
        value={localValue}
        style={[styles.input, inputStyle]}
        onChangeText={handleChangeText}
        onBlur={handleFinishEditing}
        onSubmitEditing={handleFinishEditing}
        keyboardType="numeric"
        returnKeyType="done"
        {...textInputProps}
      />
      <View style={[styles.buttonContainer, buttonContainerStyle]}>
        <Button onPress={handleDecrement} style={[buttonStyle]}>
          -{step}
        </Button>
        <Button onPress={handleIncrement} style={[buttonStyle]}>
          +{step}
        </Button>
      </View>
    </View>
  );
};
