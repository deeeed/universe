import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  onInlineEdit?: (newValue?: unknown) => void | Promise<void>; // Callback function when inline edit is pressed
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
  isSaving: _isSaving,
  testID,
}: EditableInfoCardProps): React.ReactNode {
  const theme = useTheme();
  const styles = useMemo(() => getStyles({ theme }), [theme]);
  const [isEditing, setIsEditing] = useState(false);
  const [editedValue, setEditedValue] = useState(value as string);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    setEditedValue(value as string);
  }, [value]);

  const handleEdit = useCallback(() => {
    if (disabled || isProcessing) return;

    if (inlineEditable) {
      setIsEditing(true);
      setValidationError(null); // Clear any previous validation errors
    } else if (editable && onEdit) {
      onEdit();
    }
  }, [disabled, isProcessing, inlineEditable, editable, onEdit]);

  const handleInlineEditComplete = useCallback(async () => {
    if (disabled || isProcessing) return;

    // Validate input if validator is provided
    if (validate) {
      const validationResult = validate(editedValue);
      if (typeof validationResult === 'string') {
        setValidationError(validationResult);
        return;
      }
      if (validationResult === false) {
        setValidationError(errorMessage || 'Invalid input');
        return;
      }
    }
    setValidationError(null);

    // Only call onInlineEdit if value actually changed
    if (onInlineEdit && editedValue !== value) {
      try {
        setIsProcessing(true);
        await onInlineEdit(editedValue);
        // Only exit editing mode after successful completion
        setIsEditing(false);
      } catch (error) {
        // If the callback fails, stay in editing mode and show error
        console.error('EditableInfoCard: onInlineEdit failed:', error);
        setValidationError(
          error instanceof Error ? error.message : 'Failed to save changes'
        );
      } finally {
        setIsProcessing(false);
      }
    } else {
      // No changes made, just exit editing mode
      setIsEditing(false);
    }
  }, [
    disabled,
    isProcessing,
    validate,
    editedValue,
    errorMessage,
    onInlineEdit,
    value,
  ]);

  const handleInlineEditCancel = useCallback(() => {
    if (isProcessing) return; // Prevent canceling during save

    setIsEditing(false);
    setEditedValue(value as string);
    setValidationError(null);
  }, [isProcessing, value]);

  const handleKeyPress = useCallback(
    (e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
      if (e.nativeEvent.key === 'Escape') {
        handleInlineEditCancel();
      }
    },
    [handleInlineEditCancel]
  );

  const handlePress = useCallback(() => {
    if (inlineEditable || editable) {
      handleEdit();
    } else if (onRightActionPress) {
      onRightActionPress();
    }
  }, [inlineEditable, editable, handleEdit, onRightActionPress]);

  const defaultRightAction = useMemo(() => {
    if (!(editable || inlineEditable)) return null;

    return (
      <>
        {isEditing ? (
          <>
            <IconButton
              icon="check"
              size={20}
              style={styles.icon}
              onPress={handleInlineEditComplete}
              accessibilityLabel="Confirm edit"
              disabled={isProcessing || disabled}
            />
            {isProcessing ? (
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
            disabled={disabled || processing}
          />
        )}
      </>
    );
  }, [
    editable,
    inlineEditable,
    isEditing,
    styles.icon,
    handleInlineEditComplete,
    isProcessing,
    disabled,
    handleInlineEditCancel,
    handleEdit,
    processing,
  ]);

  const rightActionComponent = rightAction ?? defaultRightAction;

  // Show validation error or external error
  const displayError = validationError || (error && errorMessage);

  return (
    <Pressable
      onPress={handlePress}
      disabled={
        (!editable && !inlineEditable && !onRightActionPress) ||
        disabled ||
        isProcessing
      }
      style={({ pressed }) => [
        styles.container,
        containerStyle,
        (disabled || isProcessing) && { opacity: 0.5 },
        pressed && !disabled && !isProcessing && { opacity: 0.7 },
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
          {processing || isProcessing ? (
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
              editable={!isProcessing}
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
        {displayError && (
          <Text style={styles.errorText} testID={`${testID}-error-text`}>
            {displayError}
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
