import React, { useMemo } from 'react';
import { StyleProp, StyleSheet, TextStyle, View } from 'react-native';
import { Text } from 'react-native-paper';

const getStyles = () => {
  return StyleSheet.create({
    container: {
      width: '100%',
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-start',
      gap: 10,
    },
    colorPreview: {
      // Ensure the color preview is visible
      borderWidth: 1,
      minWidth: 20, // Use previewSize or a minimum value
      minHeight: 20, // Use previewSize or a minimum value
    },
    labelContainer: {
      flexDirection: 'row',
      gap: 5,
      alignItems: 'center',
      justifyContent: 'center',
    },
    textStyle: {},
  });
};

export interface ColorItemProps {
  label?: string;
  labelStyle?: StyleProp<TextStyle>;
  color: string;
  previewSize?: number;
}
export const ColorItem = ({
  color,
  labelStyle,
  label,
  previewSize = 20,
}: ColorItemProps) => {
  const styles = useMemo(() => getStyles(), []);

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.colorPreview,
          { backgroundColor: color, width: previewSize, height: previewSize },
        ]}
      />
      {label ? (
        <View style={styles.labelContainer}>
          <Text style={[styles.textStyle, labelStyle]}>{label}</Text>
          <Text style={[styles.textStyle, labelStyle]}>( {color} )</Text>
        </View>
      ) : (
        <Text style={[styles.textStyle, labelStyle]}>{color}</Text>
      )}
    </View>
  );
};
