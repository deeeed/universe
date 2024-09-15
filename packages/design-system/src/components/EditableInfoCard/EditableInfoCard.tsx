import React, { useMemo } from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { ActivityIndicator, IconButton, Text } from 'react-native-paper';
import { AppTheme } from '../../hooks/_useAppThemeSetup';
import { useTheme } from '../../providers/ThemeProvider';

export interface EditableInfoCardProps {
  label?: string;
  value?: unknown;
  processing?: boolean;
  error?: boolean;
  renderValue?: (value?: unknown) => React.ReactNode;
  editable?: boolean; // New property to determine if the item is editable
  onEdit?: () => void; // Callback function when edit icon is pressed
  labelStyle?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  rightAction?: React.ReactNode; // New prop for custom right action
  onRightActionPress?: () => void; // Callback for right action press
}

const getStyles = ({ theme }: { theme: AppTheme }) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 5,
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderRadius: 8,
    },
    contentContainer: {
      flex: 1,
      flexDirection: 'column',
      justifyContent: 'center',
    },
    label: {
      fontWeight: 'bold',
    },
    content: {
      // wordWrap: 'break-word',
      // whiteSpace: 'pre-wrap',
      maxWidth: '100%',
    },
    iconContainer: {
      alignSelf: 'stretch',
      justifyContent: 'center',
      marginLeft: 5, // Add some space between content and icon
    },
    icon: {},
  });

export function EditableInfoCard({
  label,
  value,
  error,
  processing,
  editable,
  onEdit,
  renderValue,
  containerStyle,
  contentStyle,
  labelStyle,
  rightAction,
  onRightActionPress,
}: EditableInfoCardProps): React.ReactNode {
  const theme = useTheme();
  const styles = useMemo(() => getStyles({ theme }), [theme]);

  const defaultRightAction = editable ? (
    <IconButton icon="pencil" size={20} style={styles.icon} onPress={onEdit} />
  ) : null;

  const rightActionComponent = rightAction ?? defaultRightAction;

  const content = (
    <View style={[styles.container, containerStyle]}>
      <View style={styles.contentContainer}>
        {label ? <Text style={[styles.label, labelStyle]}>{label}</Text> : null}
        <View style={[styles.content, contentStyle]}>
          {processing ? (
            <ActivityIndicator size="small" />
          ) : renderValue ? (
            renderValue(value)
          ) : (
            <Text
              style={{
                color: error ? theme.colors.error : theme.colors.text,
              }}
            >
              {typeof value === 'string' ? value : value?.toString()}
            </Text>
          )}
        </View>
      </View>
      {rightActionComponent && (
        <View style={styles.iconContainer}>{rightActionComponent}</View>
      )}
    </View>
  );

  const handlePress = () => {
    if (editable && onEdit) {
      onEdit();
    } else if (onRightActionPress) {
      onRightActionPress();
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={!editable && !onRightActionPress}
    >
      {content}
    </Pressable>
  );
}
