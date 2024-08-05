import React, { useMemo } from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { ActivityIndicator, IconButton, Text } from 'react-native-paper';
import { useTheme } from '../../providers/ThemeProvider';
import { AppTheme } from '../../hooks/_useAppThemeSetup';

export interface EditableInfoCardProps {
  label: string;
  value?: string;
  processing?: boolean;
  error?: boolean;
  editable?: boolean; // New property to determine if the item is editable
  onEdit?: () => void; // Callback function when edit icon is pressed
  containerStyle?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
}

const getStyles = ({ theme }: { theme: AppTheme }) =>
  StyleSheet.create({
    container: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      justifyContent: 'flex-start',
      padding: 8,
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderRadius: 8,
      // width: '100%',
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
    icon: {
      position: 'absolute',
      right: 8,
      top: 8,
    },
  });

export const EditableInfoCard = ({
  label,
  value,
  error,
  processing,
  editable,
  onEdit,
  containerStyle,
  contentStyle,
}: EditableInfoCardProps) => {
  const theme = useTheme();
  const styles = useMemo(() => getStyles({ theme }), [theme]);

  const content = (
    <View style={[styles.container, containerStyle]}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.content, contentStyle]}>
        {processing ? (
          <ActivityIndicator size="small" />
        ) : (
          <Text
            style={{
              color: error ? theme.colors.error : theme.colors.text,
            }}
          >
            {value}
          </Text>
        )}
      </View>
      {editable && (
        <IconButton
          icon="pencil"
          size={20}
          style={styles.icon}
          onPress={onEdit}
        />
      )}
    </View>
  );

  return editable ? <Pressable onPress={onEdit}>{content}</Pressable> : content;
};
