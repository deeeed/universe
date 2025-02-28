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
  testID?: string;
}

export const HelperText = ({
  text,
  iconSize = 24,
  iconColor,
  textStyle,
  containerStyle,
  maxLines = 3,
  testID,
}: HelperTextProps) => {
  const theme = useTheme();
  const styles = getStyles({ theme });
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpand = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  return (
    <View style={[styles.container, containerStyle]} testID={testID}>
      <View style={styles.iconContainer} testID={`${testID}-icon-container`}>
        <Ionicons
          name="information-circle"
          size={iconSize}
          color={iconColor || theme.colors.primary}
          testID={`${testID}-icon`}
        />
      </View>
      <TouchableOpacity
        style={styles.textContainer}
        onPress={toggleExpand}
        testID={`${testID}-text-container`}
      >
        <Text
          style={[styles.text, textStyle]}
          numberOfLines={isExpanded ? undefined : maxLines}
          ellipsizeMode="tail"
          testID={`${testID}-text`}
        >
          {text}
        </Text>
      </TouchableOpacity>
    </View>
  );
};
