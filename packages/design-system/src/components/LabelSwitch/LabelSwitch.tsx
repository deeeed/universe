import React, { useMemo } from 'react';
import { Pressable, StyleProp, TextStyle, ViewStyle, View } from 'react-native';
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
    labelContainer: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
    },
    icon: {
      marginRight: 8,
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
  icon?: React.ReactNode;
}

export const LabelSwitch = ({
  label,
  value,
  containerStyle,
  labelStyle,
  onValueChange,
  icon,
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
      <View style={styles.labelContainer}>
        {icon && <View style={styles.icon}>{icon}</View>}
        <Text style={[styles.label, labelStyle]}>{label}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        // Prevent the Pressable's onPress from firing when the Switch is pressed
        onTouchStart={(e) => e.stopPropagation()}
      />
    </Pressable>
  );
};
