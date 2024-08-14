import { useTheme } from '../../../providers/ThemeProvider';
import { AppTheme } from '../../../hooks/_useAppThemeSetup';
import {
  BottomSheetHandle,
  BottomSheetHandleProps,
} from '@gorhom/bottom-sheet';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

const getStyles = (theme: AppTheme) => {
  return StyleSheet.create({
    container: {
      backgroundColor: theme.colors.background,
      paddingBottom: theme.padding.l,
      paddingHorizontal: theme.padding.l,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.outline,
      zIndex: 99999,
    },
    titleContainer: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    title: {
      marginTop: theme.margin.l,
      fontSize: 20,
      lineHeight: 20,
      textAlign: 'center',
      fontWeight: 'bold',
    },
    indicator: {
      height: 4,
      opacity: 0.5,
      backgroundColor: theme.colors.text,
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
      <View style={styles.titleContainer}>
        <Text variant="headlineMedium">{label}</Text>
      </View>
    </BottomSheetHandle>
  );
};
