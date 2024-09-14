import React, { useMemo } from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { ActivityIndicator, IconButton, Text } from 'react-native-paper';
import { AppTheme } from '../../hooks/_useAppThemeSetup';
import { useTheme } from '../../providers/ThemeProvider';

export interface EditableInfoCardProps {
  label: string;
  value?: unknown;
  processing?: boolean;
  error?: boolean;
  renderValue?: (value?: unknown) => React.ReactNode;
  editable?: boolean; // New property to determine if the item is editable
  onEdit?: () => void; // Callback function when edit icon is pressed
  containerStyle?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
}

const getStyles = ({ theme }: { theme: AppTheme }) =>
  StyleSheet.create({
    container: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'flex-start',
      padding: 8,
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderRadius: 8,
    },
    contentContainer: {
      flex: 1,
    },
    label: {
      fontWeight: 'bold',
    },
    content: {
      paddingLeft: 5,
      paddingTop: 5,
      // wordWrap: 'break-word',
      // whiteSpace: 'pre-wrap',
      maxWidth: '100%',
    },
    iconContainer: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
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
}: EditableInfoCardProps): React.ReactNode {
  const theme = useTheme();
  const styles = useMemo(() => getStyles({ theme }), [theme]);

  const content = (
    <View style={[styles.container, containerStyle]}>
      <View style={styles.contentContainer}>
        <Text style={styles.label}>{label}</Text>
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
      {editable && (
        <View style={styles.iconContainer}>
          <IconButton
            icon="pencil"
            size={20}
            style={styles.icon}
            onPress={onEdit}
          />
        </View>
      )}
    </View>
  );

  return editable ? <Pressable onPress={onEdit}>{content}</Pressable> : content;
}
