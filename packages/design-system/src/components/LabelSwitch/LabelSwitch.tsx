import React, { useMemo } from 'react';
import { Pressable, StyleProp, TextStyle, ViewStyle } from 'react-native';
import { Switch, Text } from 'react-native-paper';
import { AppTheme } from '../../hooks/_useAppThemeSetup';
import { useTheme } from '../../providers/ThemeProvider';

const getStyle = (theme: AppTheme) => {
  return {
    container: {
      display: 'flex' as const,
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      padding: 10,
      backgroundColor: theme.colors.surface,
    },
    label: {
      paddingRight: 10,
      color: theme.colors.text,
    },
  };
};

export interface LabelSwitchProps {
  label: string;
  value: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  onValueChange: (value: boolean) => void;
}

export const LabelSwitch = ({
  label,
  value,
  containerStyle,
  labelStyle,
  onValueChange,
}: LabelSwitchProps) => {
  const theme = useTheme();
  const styles = useMemo(() => getStyle(theme), [theme]);

  const handleContainerPress = () => {
    onValueChange(!value);
  };

  return (
    <Pressable
      style={[styles.container, containerStyle]}
      onPress={handleContainerPress}
    >
      <Text style={[styles.label, labelStyle]}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        // Prevent the Pressable's onPress from firing when the Switch is pressed
        onTouchStart={(e) => e.stopPropagation()}
      />
    </Pressable>
  );
};
