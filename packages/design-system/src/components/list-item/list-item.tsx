import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  TextStyle,
  View,
} from 'react-native';
import { AppTheme } from '../../hooks/use-app-theme-setup';
import { useTheme } from '../../providers/theme-provider';
import { Text } from 'react-native-paper';

const getStyle = (theme: AppTheme) => {
  return StyleSheet.create({
    container: {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 10,
      margin: 10,
      backgroundColor: theme.colors.background,
    },
    textContainer: {
      flex: 1,
    },
    label: {
      paddingRight: 10,
      fontWeight: 'bold',
    },
    subLabel: {
      color: theme.colors.text,
    },
  });
};

export interface ListItemProps {
  label: string;
  labelStyle: StyleProp<TextStyle>;
  subLabel?: string;
  subLabelStyle?: StyleProp<TextStyle>;
  onPress?: () => void;
}
export const ListItem = ({
  label,
  labelStyle,
  subLabel,
  subLabelStyle,
  onPress,
}: ListItemProps) => {
  const theme = useTheme();
  const styles = useMemo(() => getStyle(theme), [theme]);

  return (
    <Pressable style={styles.container} onPress={onPress}>
      <View style={styles.textContainer}>
        <Text style={[styles.label, labelStyle]}>{label}</Text>
        <Text style={[styles.subLabel, subLabelStyle]}>{subLabel}</Text>
      </View>
      <MaterialCommunityIcons
        name={'chevron-right'}
        size={24}
        color={theme.colors.text}
      />
    </Pressable>
  );
};
