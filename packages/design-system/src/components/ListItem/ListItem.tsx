import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { AppTheme } from '../../hooks/_useAppThemeSetup';
import { useTheme } from '../../providers/ThemeProvider';
import { Text } from 'react-native-paper';

const getStyle = (theme: AppTheme) => {
  return StyleSheet.create({
    container: {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 10,
      backgroundColor: theme.colors.surface,
    },
    textContainer: {
      flex: 1,
    },
    label: {
      paddingRight: 10,
      fontWeight: 'bold',
    },
    subLabel: {
      color: theme.colors.text,
    },
  });
};

export interface ListItemProps {
  contentContainerStyle?: StyleProp<ViewStyle>;
  textContentContainerStyle?: StyleProp<ViewStyle>;
  label: string;
  labelStyle?: StyleProp<TextStyle>;
  subLabel?: string;
  subLabelStyle?: StyleProp<TextStyle>;
  onPress?: () => void;
  testID?: string;
}
export const ListItem = ({
  label,
  labelStyle,
  subLabel,
  contentContainerStyle,
  textContentContainerStyle,
  subLabelStyle,
  onPress,
  testID,
}: ListItemProps) => {
  const theme = useTheme();
  const styles = useMemo(() => getStyle(theme), [theme]);

  return (
    <Pressable
      style={[styles.container, contentContainerStyle]}
      onPress={onPress}
      testID={testID}
    >
      <View
        style={[styles.textContainer, textContentContainerStyle]}
        testID={testID ? `${testID}-text-container` : undefined}
      >
        <Text
          style={[styles.label, labelStyle]}
          testID={testID ? `${testID}-label` : undefined}
        >
          {label}
        </Text>
        {subLabel ? (
          <Text
            style={[styles.subLabel, subLabelStyle]}
            testID={testID ? `${testID}-sublabel` : undefined}
          >
            {subLabel}
          </Text>
        ) : null}
      </View>
      <MaterialCommunityIcons
        name={'chevron-right'}
        size={24}
        color={theme.colors.text}
        testID={testID ? `${testID}-icon` : undefined}
      />
    </Pressable>
  );
};
