import React, { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  TextStyle,
  View,
  ViewStyle,
  Platform,
} from 'react-native';
import { ActivityIndicator, IconButton, Text } from 'react-native-paper';
import { AppTheme } from '../../hooks/_useAppThemeSetup';
import { useTheme } from '../../providers/ThemeProvider';
import { TextInput } from '../TextInput/TextInput';
import { NativeSyntheticEvent } from 'react-native';
import { TextInputKeyPressEventData } from 'react-native';

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
  validate?: (value: string) => boolean | string;
  errorMessage?: string;
  placeholder?: string;
  multiline?: boolean;
  numberOfLines?: number;
  isSaving?: boolean;
}

const getStyles = ({ theme }: { theme: AppTheme }) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
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
      marginBottom: 4,
    },
    content: {
      maxWidth: '100%',
      minHeight: 24,
      justifyContent: 'center',
    },
    iconContainer: {
      height: 24,
      flexDirection: 'row',
      alignItems: 'center',
      marginLeft: 5,
    },
    icon: {
      margin: 0,
      padding: 0,
    },
    textInput: {
      backgroundColor: 'transparent',
      paddingVertical: 0,
      paddingHorizontal: 0,
      margin: 0,
      height: 24,
      lineHeight: Platform.OS === 'ios' ? undefined : 24,
      textAlignVertical: Platform.OS === 'ios' ? 'top' : 'center',
      fontSize: 14,
      paddingTop: 0,
      paddingBottom: 0,
    },
    text: {
      minHeight: 24,
      lineHeight: 24,
      textAlignVertical: 'center',
      fontSize: 14,
      flexWrap: 'wrap',
    },
    errorText: {
      color: theme.colors.error,
      fontSize: 12,
      marginTop: 4,
    },
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
  validate,
  errorMessage,
  placeholder,
  multiline,
  numberOfLines,
  isSaving,
}: EditableInfoCardProps): React.ReactNode {
  const theme = useTheme();
  const styles = useMemo(() => getStyles({ theme }), [theme]);
  const [isEditing, setIsEditing] = useState(false);
  const [editedValue, setEditedValue] = useState(value as string);
  const [validationError, setValidationError] = useState<string | null>(null);

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
    if (validate) {
      const validationResult = validate(editedValue);
      if (typeof validationResult === 'string') {
        setValidationError(validationResult);
        return;
      }
      if (!validationResult) {
        setValidationError(errorMessage || 'Invalid input');
        return;
      }
    }
    setValidationError(null);
    setIsEditing(false);
    if (onInlineEdit && editedValue !== value) {
      onInlineEdit(editedValue);
    }
  };

  const handleInlineEditCancel = () => {
    setIsEditing(false);
    setEditedValue(value as string);
  };

  const handleKeyPress = (
    e: NativeSyntheticEvent<TextInputKeyPressEventData>
  ) => {
    if (e.nativeEvent.key === 'Escape') {
      handleInlineEditCancel();
    }
  };

  const defaultRightAction =
    editable || inlineEditable ? (
      <>
        {isEditing ? (
          <>
            <IconButton
              icon="check"
              size={20}
              style={styles.icon}
              onPress={handleInlineEditComplete}
              accessibilityLabel="Confirm edit"
              disabled={isSaving}
            />
            {isSaving ? (
              <ActivityIndicator size={20} style={styles.icon} />
            ) : (
              <IconButton
                icon="close"
                size={20}
                style={styles.icon}
                onPress={handleInlineEditCancel}
                accessibilityLabel="Cancel editing"
              />
            )}
          </>
        ) : (
          <IconButton
            icon="pencil"
            size={20}
            style={styles.icon}
            onPress={handleEdit}
            accessibilityLabel="Edit value"
          />
        )}
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
              onKeyPress={handleKeyPress}
              style={[styles.textInput, contentStyle]}
              placeholder={placeholder}
              placeholderTextColor={theme.colors.onSurfaceDisabled}
              multiline={multiline}
              numberOfLines={numberOfLines}
            />
          ) : renderValue ? (
            renderValue(value)
          ) : (
            <Text
              style={[
                styles.text,
                {
                  color: error ? theme.colors.error : theme.colors.text,
                },
                contentStyle,
              ]}
              numberOfLines={multiline ? numberOfLines : 1}
            >
              {typeof value === 'string' ? value : value?.toString()}
            </Text>
          )}
        </View>
        {validationError && (
          <Text style={styles.errorText}>{validationError}</Text>
        )}
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
