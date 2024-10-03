import React, { useEffect, useMemo, useState } from 'react';
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
import { TextInput } from '../TextInput/TextInput';

export interface EditableInfoCardProps {
  label?: string;
  value?: unknown;
  processing?: boolean;
  error?: boolean;
  renderValue?: (value?: unknown) => React.ReactNode;
  editable?: boolean; // determine if the item is editable
  inlineEditable?: boolean; // if the item is inline editable
  onEdit?: () => void; // Callback function when edit icon is pressed
  onInlineEdit?: (newValue?: unknown) => void; // Callback function when inline edit is pressed
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
  inlineEditable,
  onEdit,
  onInlineEdit,
  renderValue,
  containerStyle,
  contentStyle,
  labelStyle,
  rightAction,
  onRightActionPress,
}: EditableInfoCardProps): React.ReactNode {
  const theme = useTheme();
  const styles = useMemo(() => getStyles({ theme }), [theme]);
  const [isEditing, setIsEditing] = useState(false);
  const [editedValue, setEditedValue] = useState(value as string);

  useEffect(() => {
    setEditedValue(value as string);
  }, [value]);

  const handleEdit = () => {
    if (inlineEditable) {
      setIsEditing(true);
    } else if (editable && onEdit) {
      onEdit();
    }
  };

  const handleInlineEditComplete = () => {
    setIsEditing(false);
    if (onInlineEdit && editedValue !== value) {
      onInlineEdit(editedValue);
    }
  };

  const handleInlineEditCancel = () => {
    setIsEditing(false);
    setEditedValue(value as string);
  };

  const defaultRightAction =
    editable || inlineEditable ? (
      <>
        {isEditing && (
          <IconButton
            icon="close"
            size={20}
            style={styles.icon}
            onPress={handleInlineEditCancel}
            accessibilityLabel="Cancel editing"
          />
        )}
        <IconButton
          icon={isEditing ? 'check' : 'pencil'}
          size={20}
          style={styles.icon}
          onPress={isEditing ? handleInlineEditComplete : handleEdit}
          accessibilityLabel={isEditing ? 'Confirm edit' : 'Edit value'}
        />
      </>
    ) : null;

  const rightActionComponent = rightAction ?? defaultRightAction;

  const content = (
    <View style={[styles.container, containerStyle]}>
      <View style={styles.contentContainer}>
        {label ? <Text style={[styles.label, labelStyle]}>{label}</Text> : null}
        <View style={[styles.content, contentStyle]}>
          {processing ? (
            <ActivityIndicator size="small" />
          ) : isEditing ? (
            <TextInput
              autoFocus
              value={editedValue}
              onChangeText={setEditedValue}
              onBlur={handleInlineEditComplete}
              onSubmitEditing={handleInlineEditComplete}
              style={{ backgroundColor: 'transparent' }}
            />
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
    if (inlineEditable || editable) {
      handleEdit();
    } else if (onRightActionPress) {
      onRightActionPress();
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={!editable && !inlineEditable && !onRightActionPress}
    >
      {content}
    </Pressable>
  );
}
