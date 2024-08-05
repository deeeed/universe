import React, { useMemo } from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../../providers/ThemeProvider';
import { AppTheme } from '../../../hooks/_useAppThemeSetup';

const getStyles = ({ theme }: { theme: AppTheme }) => {
  return StyleSheet.create({
    container: {},
    header: {
      padding: 12,
      backgroundColor: theme.colors.primaryContainer,
      color: theme.colors.text,
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    title: {
      color: theme.colors.text,
    },
    contentContainer: {
      padding: 5,
      backgroundColor: theme.colors.background,
    },
  });
};

export interface AccordionItemData {
  title: string;
  expanded?: boolean;
  onHeaderPress?: () => void;
}

export interface AccordionItemProps extends AccordionItemData {
  children: React.ReactNode;
  titleStyle?: StyleProp<TextStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
}
export const AccordionItem = ({
  title,
  titleStyle,
  contentContainerStyle,
  children,
  expanded = false,
  onHeaderPress,
}: AccordionItemProps) => {
  const theme = useTheme();
  const styles = useMemo(() => getStyles({ theme }), [theme]);

  return (
    <View style={styles.container}>
      <Pressable style={styles.header} onPress={onHeaderPress}>
        <Text style={[styles.title, titleStyle]}>{title}</Text>
        <MaterialCommunityIcons
          name={expanded ? 'chevron-down' : 'chevron-right'}
          size={24}
          color={theme.colors.text}
        />
      </Pressable>
      {expanded && (
        <View style={[styles.contentContainer, contentContainerStyle]}>
          {children}
        </View>
      )}
    </View>
  );
};
