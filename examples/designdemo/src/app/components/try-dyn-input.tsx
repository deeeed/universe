import React, { useState } from 'react';
import {
  ColorItem,
  DynInput,
  ScreenWrapper,
  SelectOption,
  Button,
} from "@siteed/design-system";
import { Pressable, View, ScrollView, StyleSheet } from "react-native";
import { Text } from "react-native-paper";

export const randomSelectValues: SelectOption[] = Array.from(
  { length: 20 },
  (_, i) => ({
    label: `label ${i}`,
    value: `val${i}`,
  }),
);

export const colors = ["#fbc02d", "#663399", "#ffa000", "#1976d2", "#689f38"];
export const colorOptions: SelectOption[] = colors.map((color) => ({
  label: color,
  value: color,
}));

const TryDynInput = () => {
  const [numberValue, setNumberValue] = useState<number>(0);
  const [textAreaValue, setTextAreaValue] = useState<string>('');
  const [selectedColors, setSelectedColors] = useState<SelectOption[]>(colorOptions);

  return (
    <ScreenWrapper>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.sectionTitle}>Text Input</Text>
        <DynInput 
          data="Default text" 
          inputType="text" 
          label="Simple Text Input"
          onFinish={(value) => console.log('Text input finished:', value)}
        />

        <Text style={styles.sectionTitle}>Number Input</Text>
        <DynInput 
          data={numberValue} 
          inputType="number" 
          label="Number Input"
          onFinish={(value) => setNumberValue(Number(value))}
        />
        <Text>Current number value: {numberValue}</Text>

        <Text style={styles.sectionTitle}>Textarea Input</Text>
        <DynInput 
          data={textAreaValue} 
          inputType="text" 
          label="Multiline Text Input"
          numberOfLines={4}
          onFinish={(value) => setTextAreaValue(String(value))}
        />

        <Text style={styles.sectionTitle}>Select Buttons (Multi-select)</Text>
        <DynInput
          data={randomSelectValues}
          inputType="select-button"
          multiSelect
          max={3}
          showSearch
          label="Choose up to 3 options"
          onFinish={(value) => console.log('Selected options:', value)}
        />

        <Text style={styles.sectionTitle}>Select Buttons (Single-select)</Text>
        <DynInput
          data={randomSelectValues.slice(0, 5)}
          inputType="select-button"
          label="Choose one option"
          onFinish={(value) => console.log('Selected option:', value)}
        />

        <Text style={styles.sectionTitle}>Custom Render (Color Picker)</Text>
        <DynInput
          data={selectedColors}
          inputType="custom"
          label="Pick colors"
          customRender={(value, onChange) => {
            const handlePress = (pressed: SelectOption) => {
              const updatedColors = (value as SelectOption[]).map(color => 
                color.value === pressed.value ? {...color, selected: !color.selected} : color
              );
              onChange(updatedColors);
            };

            if (Array.isArray(value)) {
              return (
                <View style={styles.colorContainer}>
                  {value.map((option, index) => (
                    <Pressable
                      key={`${option.label}-${index}`}
                      onPress={() => handlePress(option)}
                      style={[styles.colorItem, option.selected && styles.selectedColor]}
                    >
                      <ColorItem color={option.value} />
                    </Pressable>
                  ))}
                </View>
              );
            }

            return <Text>{JSON.stringify(value)}</Text>;
          }}
          onFinish={(value) => setSelectedColors(value as SelectOption[])}
        />
        <Text>Selected colors: {selectedColors.filter(c => c.selected).map(c => c.value).join(', ')}</Text>

        <Button onPress={() => console.log('All current values:', { numberValue, textAreaValue, selectedColors })}>
          Log All Values
        </Button>
      </ScrollView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
  colorContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  colorItem: {
    margin: 5,
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: 5,
  },
  selectedColor: {
    borderColor: 'black',
  },
});

export default TryDynInput;
