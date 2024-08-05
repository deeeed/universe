import React, { useMemo } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { EdgeInsets, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppTheme } from '../../hooks/useAppThemeSetup';
import { useTheme } from '../../providers/ThemeProvider';

const getStyles = ({
  theme,
  insets,
}: {
  theme: AppTheme;
  insets: EdgeInsets;
}) => {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
      paddingBottom: insets.bottom,
      paddingLeft: insets.left,
      paddingRight: insets.left,
    },
  });
};

export interface ThemedViewProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const ThemedView = ({ children, style }: ThemedViewProps) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => getStyles({ theme, insets }), [theme, insets]);

  return <View style={[styles.container, style]}>{children}</View>;
};
