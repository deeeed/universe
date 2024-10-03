import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useState } from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { AppTheme } from '../../hooks/_useAppThemeSetup';
import { useTheme } from '../../providers/ThemeProvider';

const getStyles = ({ theme }: { theme: AppTheme }) => {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    iconContainer: {
      marginRight: 10,
      marginTop: 2,
    },
    textContainer: {
      flex: 1,
    },
    text: {
      color: theme.colors.outline,
    },
  });
};

export interface HelperTextProps {
  text: string;
  iconSize?: number;
  iconColor?: string;
  textStyle?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  maxLines?: number;
}

export const HelperText = ({
  text,
  iconSize = 24,
  iconColor,
  textStyle,
  containerStyle,
  maxLines = 3,
}: HelperTextProps) => {
  const theme = useTheme();
  const styles = getStyles({ theme });
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpand = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  return (
    <View style={[styles.container, containerStyle]}>
      <View style={styles.iconContainer}>
        <Ionicons
          name="information-circle"
          size={iconSize}
          color={iconColor || theme.colors.primary}
        />
      </View>
      <TouchableOpacity style={styles.textContainer} onPress={toggleExpand}>
        <Text
          style={[styles.text, textStyle]}
          numberOfLines={isExpanded ? undefined : maxLines}
          ellipsizeMode="tail"
        >
          {text}
        </Text>
      </TouchableOpacity>
    </View>
  );
};
