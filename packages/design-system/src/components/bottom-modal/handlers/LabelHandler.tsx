import {
  BottomSheetHandle,
  BottomSheetHandleProps,
} from '@gorhom/bottom-sheet';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { AppTheme } from '../../../hooks/_useAppThemeSetup';
import { useTheme } from '../../../providers/ThemeProvider';

const getStyles = (theme: AppTheme) => {
  return StyleSheet.create({
    container: {
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.outline,
      borderTopLeftRadius: 15,
      borderTopRightRadius: 15,
      gap: 5,
      backgroundColor: theme.colors.surfaceVariant,
    },
    titleContainer: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    title: {
      marginTop: theme.spacing.margin,
      fontSize: 20,
      lineHeight: 20,
      textAlign: 'center',
      fontWeight: 'bold',
    },
    indicator: {
      opacity: 0.5,
      color: theme.colors.text,
      alignSelf: 'center',
      height: 4,
    },
  });
};

export interface LabelHandlerProps extends BottomSheetHandleProps {
  label?: string;
  testID?: string;
}
export const LabelHandler = ({
  label = '',
  testID,
  ...rest
}: LabelHandlerProps) => {
  const theme = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);

  return (
    <View testID={testID}>
      <BottomSheetHandle
        {...rest}
        indicatorStyle={styles.indicator}
        style={styles.container}
      >
        {label ? (
          <View
            style={styles.titleContainer}
            testID={testID ? `${testID}-title-container` : undefined}
          >
            <Text
              variant="titleSmall"
              testID={testID ? `${testID}-title` : undefined}
            >
              {label}
            </Text>
          </View>
        ) : undefined}
      </BottomSheetHandle>
    </View>
  );
};
