import React, { useMemo } from 'react';
import {
  StyleProp,
  StyleSheet,
  TextStyle,
  View,
  TouchableOpacity,
} from 'react-native';
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
  onPress?: () => void;
}

export const ColorItem = ({
  color,
  labelStyle,
  label,
  previewSize = 20,
  onPress, // Add this line
}: ColorItemProps) => {
  const styles = useMemo(() => getStyles(), []);

  const content = (
    <>
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
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity style={styles.container} onPress={onPress}>
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={styles.container}>{content}</View>;
};
