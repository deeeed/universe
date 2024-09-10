import React, { useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { AppTheme } from '../../../hooks/_useAppThemeSetup';
import { useTheme } from '../../../providers/ThemeProvider';
import { SelectOption } from '../../SelectButtons/SelectButtons';
import { useModal } from '../../../hooks/useModal';

const getStyles = (theme: AppTheme) => {
  return StyleSheet.create({
    container: {
      backgroundColor: theme.colors.surface,
      display: 'flex',
      gap: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    colorPreview: {
      width: 30,
      height: 30,
    },
  });
};

export interface ColorPickerProps {
  label: string;
  color: string;
  colorOptions: string[];
  onChange?: (color: string) => void;
}

export const ColorPicker = ({
  label,
  color,
  onChange,
  colorOptions = [color],
}: ColorPickerProps) => {
  // const theme = useTheme();
  const theme = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const [activeColor, setActiveColor] = React.useState(color);
  const { editProp } = useModal();

  useEffect(() => {
    setActiveColor(color);
  }, [color]);

  const handlePress = async () => {
    // reset colorOptions and set only the active color
    const data: SelectOption[] = colorOptions.map((colorOption) => {
      return {
        label: colorOption,
        value: colorOption,
        selected: colorOption === activeColor,
      };
    });
    const selectedColor = (await editProp({
      data: data,
      inputType: 'select-button',
      multiSelect: false,
      showFooter: false,
    })) as SelectOption;

    setActiveColor(selectedColor.value);
    onChange?.(selectedColor.value);
  };

  return (
    <Pressable style={styles.container} onPress={handlePress}>
      <Text>{label}</Text>
      <View style={[styles.colorPreview, { backgroundColor: activeColor }]} />
    </Pressable>
  );
};
