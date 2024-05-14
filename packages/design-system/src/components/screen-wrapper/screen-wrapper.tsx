import React, { useMemo } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { EdgeInsets, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppTheme } from '../../hooks/use-app-theme-setup';
import { useTheme } from '../../providers/theme-provider';

const getStyles = ({
  theme,
  insets,
  useInsets,
}: {
  theme: AppTheme;
  insets: EdgeInsets;
  useInsets: boolean;
}) => {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
      paddingTop: useInsets ? insets.top : 0,
      paddingBottom: useInsets ? insets.bottom : 0,
      paddingLeft: useInsets ? insets.left : 0,
      paddingRight: useInsets ? insets.right : 0,
    },
  });
};

export interface ScreenWrapperProps {
  children: React.ReactNode;
  withScrollView?: boolean;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  useInsets?: boolean;
}

export const ScreenWrapper = ({
  children,
  withScrollView = true,
  useInsets = true,
  style,
  contentContainerStyle,
  ...rest
}: ScreenWrapperProps) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(
    () => getStyles({ theme, insets, useInsets }),
    [theme, insets, useInsets]
  );

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
