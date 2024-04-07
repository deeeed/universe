import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppTheme } from '../../hooks/use-app-theme-setup';
import { useTheme } from '../../providers/theme-provider';

export type NoticeType = 'info' | 'warning' | 'error' | 'success';
const getStyles = ({ theme, type }: { theme: AppTheme; type: NoticeType }) => {
  return StyleSheet.create({
    container: {
      padding: 10,
      backgroundColor: theme.colors.surface,
    },
  });
};

export interface NoticeProps {
  title: string;
  message?: string;
  type: NoticeType;
}

export const Notice = ({ title, message, type }: NoticeProps) => {
  const theme = useTheme();
  const styles = useMemo(() => getStyles({ theme, type }), [theme, type]);

  return (
    <View style={styles.container}>
      <Text>{title}</Text>
    </View>
  );
};
