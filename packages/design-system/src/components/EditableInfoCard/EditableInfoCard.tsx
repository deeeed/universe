import React, { useEffect, useMemo, useState } from 'react';
import {
  NativeSyntheticEvent,
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  TextInputKeyPressEventData,
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
  disabled?: boolean; // Add disabled prop
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
  testID?: string;
}

const getStyles = ({ theme }: { theme: AppTheme }) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: theme.colors.background,
      borderColor: theme.colors.outline,
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
  disabled = false,
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
  testID,
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
    if (disabled) return;

    if (inlineEditable) {
      setIsEditing(true);
    } else if (editable && onEdit) {
      onEdit();
    }
  };

  const handleInlineEditComplete = () => {
    if (disabled) return;

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
              disabled={isSaving || disabled}
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
                disabled={disabled}
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
            disabled={disabled}
          />
        )}
      </>
    ) : null;

  const rightActionComponent = rightAction ?? defaultRightAction;

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
      disabled={
        (!editable && !inlineEditable && !onRightActionPress) || disabled
      }
      style={({ pressed }) => [
        styles.container,
        containerStyle,
        disabled && { opacity: 0.5 },
        pressed && !disabled && { opacity: 0.7 },
      ]}
      testID={testID}
    >
      <View
        style={styles.contentContainer}
        testID={`${testID}-content-container`}
      >
        {label ? (
          <Text style={[styles.label, labelStyle]} testID={`${testID}-label`}>
            {label}
          </Text>
        ) : null}
        <View
          style={[styles.content, contentStyle]}
          testID={`${testID}-content`}
        >
          {processing ? (
            <ActivityIndicator
              size="small"
              testID={`${testID}-activity-indicator`}
            />
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
              testID={`${testID}-text-input`}
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
              testID={`${testID}-value-text`}
            >
              {typeof value === 'string' ? value : value?.toString()}
            </Text>
          )}
        </View>
        {validationError && (
          <Text style={styles.errorText} testID={`${testID}-error-text`}>
            {validationError}
          </Text>
        )}
      </View>
      {rightActionComponent && (
        <View style={styles.iconContainer} testID={`${testID}-icon-container`}>
          {rightActionComponent}
        </View>
      )}
    </Pressable>
  );
}
