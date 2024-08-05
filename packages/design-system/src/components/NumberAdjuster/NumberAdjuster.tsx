import React from 'react';
import { StyleSheet, View } from 'react-native';
import { TextInput } from '../TextInput/TextInput';
import { Button } from '../Button/Button';

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
}

export const NumberAdjuster: React.FC<NumberAdjusterProps> = ({
  label,
  value,
  onChange,
  min = 1,
  max = Infinity,
  step = 1,
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
    <View style={styles.inputRow}>
      <TextInput
        label={label}
        value={value.toString()}
        style={styles.input}
        onChangeText={handleChangeText}
        keyboardType="numeric"
      />
      <View style={styles.buttonContainer}>
        <Button onPress={handleDecrement}>-{step}</Button>
        <Button onPress={handleIncrement}>+{step}</Button>
      </View>
    </View>
  );
};
