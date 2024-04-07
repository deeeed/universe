import React, { useMemo } from 'react';
import {
  ScrollView,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { EdgeInsets, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppTheme } from '../../hooks/use-app-theme-setup';
import { useTheme } from '../../providers/theme-provider';

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

export interface ScreenWrapperProps {
  children: React.ReactNode;
  withScrollView?: boolean;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
}

export const ScreenWrapper = ({
  children,
  withScrollView = true,
  style,
  contentContainerStyle,
  ...rest
}: ScreenWrapperProps) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => getStyles({ theme, insets }), [theme, insets]);

  return (
    <>
      {withScrollView ? (
        <ScrollView
          {...rest}
          contentContainerStyle={contentContainerStyle}
          keyboardShouldPersistTaps="always"
          alwaysBounceVertical={false}
          showsVerticalScrollIndicator={false}
          style={[styles.container, style]}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.container, style]}>{children}</View>
      )}
    </>
  );
};
