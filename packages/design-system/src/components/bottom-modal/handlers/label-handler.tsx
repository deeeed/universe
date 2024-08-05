import { useTheme } from '../../../providers/theme-provider';
import { AppTheme } from '../../../hooks/useAppThemeSetup';
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
      paddingBottom: theme.padding.l,
      paddingHorizontal: theme.padding.l,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(0,0,0,0.075)',
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
      color: 'black',
    },
    indicator: {
      height: 4,
      opacity: 0.5,
    },
  });
};

export interface LabelHandlerProps extends BottomSheetHandleProps {
  label: string;
}
export const LabelHandler = ({ label, ...rest }: LabelHandlerProps) => {
  const theme = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);

  return (
    <BottomSheetHandle
      style={styles.container}
      indicatorStyle={styles.indicator}
      {...rest}
    >
      <View style={styles.titleContainer}>
        <Text variant="headlineMedium">{label}</Text>
      </View>
    </BottomSheetHandle>
  );
};
