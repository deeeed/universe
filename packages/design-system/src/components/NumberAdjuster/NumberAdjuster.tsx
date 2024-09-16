import React from 'react';
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
}) => {
  const styles = getStyles();

  const handleIncrement = () => {
    onChange(Math.min(value + step, max));
  };

  const handleDecrement = () => {
    onChange(Math.max(value - step, min));
  };

  const handleChangeText = (text: string) => {
    const newValue = parseInt(text, 10);
    if (!isNaN(newValue)) {
      onChange(Math.max(Math.min(newValue, max), min));
    } else {
      onChange(min);
    }
  };

  return (
    <View style={[styles.inputRow, containerStyle]}>
      <TextInput
        label={label}
        value={value.toString()}
        style={[styles.input, inputStyle]}
        onChangeText={handleChangeText}
        keyboardType="numeric"
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
