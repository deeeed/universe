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
      paddingBottom: theme.padding.l,
      paddingHorizontal: theme.padding.l,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.outline,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      backgroundColor: theme.colors.surfaceVariant,
      // zIndex: 99999,
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
}
export const LabelHandler = ({ label = '', ...rest }: LabelHandlerProps) => {
  const theme = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);

  return (
    <BottomSheetHandle
      {...rest}
      indicatorStyle={styles.indicator}
      style={styles.container}
    >
      {label ? (
        <View style={styles.titleContainer}>
          <Text variant="labelMedium">{label}</Text>
        </View>
      ) : undefined}
    </BottomSheetHandle>
  );
};
