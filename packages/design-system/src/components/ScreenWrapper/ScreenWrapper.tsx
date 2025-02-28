import React, { useMemo } from 'react';
import {
  ScrollView,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { EdgeInsets, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppTheme } from '../../hooks/_useAppThemeSetup';
import { useTheme } from '../../providers/ThemeProvider';

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
  testID?: string;
}

export const ScreenWrapper = ({
  children,
  withScrollView = true,
  useInsets = true,
  style,
  contentContainerStyle,
  testID,
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
          testID={testID}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.container, style]} testID={testID}>
          {children}
        </View>
      )}
    </>
  );
};
