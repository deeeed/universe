import React, { useState, useEffect } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Button } from '../Button/Button';
import { TextInput } from '../TextInput/TextInput';

const getStyles = () => {
  return StyleSheet.create({
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
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
  disabled?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<ViewStyle>;
  buttonStyle?: StyleProp<ViewStyle>;
  buttonContainerStyle?: StyleProp<ViewStyle>;
  textInputProps?: Partial<React.ComponentProps<typeof TextInput>>;
  testID?: string;
}

export const NumberAdjuster: React.FC<NumberAdjusterProps> = ({
  label,
  value,
  onChange,
  min = 1,
  max = Infinity,
  step = 1,
  disabled = false,
  containerStyle,
  inputStyle,
  buttonStyle,
  buttonContainerStyle,
  textInputProps,
  testID,
}) => {
  const styles = getStyles();
  const [localValue, setLocalValue] = useState(value.toString());

  useEffect(() => {
    setLocalValue(value.toString());
  }, [value]);

  useEffect(() => {
    const currentValue = parseInt(localValue, 10);
    if (!isNaN(currentValue)) {
      const boundedValue = Math.max(Math.min(currentValue, max), min);
      if (boundedValue !== currentValue) {
        onChange(boundedValue);
        setLocalValue(boundedValue.toString());
      }
    }
  }, [min, max, onChange]);

  const handleIncrement = () => {
    if (disabled) return;
    const newValue = Math.min(value + step, max);
    onChange(newValue);
    setLocalValue(newValue.toString());
  };

  const handleDecrement = () => {
    if (disabled) return;
    const newValue = Math.max(value - step, min);
    onChange(newValue);
    setLocalValue(newValue.toString());
  };

  const handleChangeText = (text: string) => {
    if (disabled) return;
    setLocalValue(text);
  };

  const handleFinishEditing = () => {
    if (disabled) return;
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
    <View
      style={[styles.inputRow, containerStyle, disabled && { opacity: 0.5 }]}
      testID={testID}
    >
      <TextInput
        label={label}
        value={localValue}
        style={[styles.input, inputStyle]}
        onChangeText={handleChangeText}
        onBlur={handleFinishEditing}
        onSubmitEditing={handleFinishEditing}
        keyboardType="numeric"
        returnKeyType="done"
        editable={!disabled}
        testID={`${testID}-input`}
        {...textInputProps}
      />
      <View
        style={[styles.buttonContainer, buttonContainerStyle]}
        testID={`${testID}-buttons-container`}
      >
        <Button
          onPress={handleDecrement}
          style={[buttonStyle]}
          disabled={disabled}
          testID={`${testID}-decrement-button`}
        >
          -{step}
        </Button>
        <Button
          onPress={handleIncrement}
          style={[buttonStyle]}
          disabled={disabled}
          testID={`${testID}-increment-button`}
        >
          +{step}
        </Button>
      </View>
    </View>
  );
};
