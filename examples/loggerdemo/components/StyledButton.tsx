import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { theme } from '../styles/theme';

interface StyledButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  size?: 'small' | 'medium' | 'large';
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const StyledButton: React.FC<StyledButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  style,
  textStyle,
}) => {
  const styles = getStyles(variant, size);
  
  return (
    <TouchableOpacity 
      style={[styles.button, style]} 
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[styles.text, textStyle]}>{title}</Text>
    </TouchableOpacity>
  );
};

const getStyles = (variant: string, size: string) => {
  const variantColors = {
    primary: { bg: theme.colors.primary, text: '#FFFFFF' },
    secondary: { bg: theme.colors.secondary, text: '#FFFFFF' },
    danger: { bg: theme.colors.danger, text: '#FFFFFF' },
    success: { bg: theme.colors.success, text: '#FFFFFF' },
  };

  const sizes = {
    small: { paddingVertical: theme.spacing.xs, paddingHorizontal: theme.spacing.sm, fontSize: 14 },
    medium: { paddingVertical: theme.spacing.sm, paddingHorizontal: theme.spacing.md, fontSize: 16 },
    large: { paddingVertical: theme.spacing.md, paddingHorizontal: theme.spacing.lg, fontSize: 18 },
  };

  const colors = variantColors[variant as keyof typeof variantColors] || variantColors.primary;
  const sizeConfig = sizes[size as keyof typeof sizes] || sizes.medium;

  return StyleSheet.create({
    button: {
      backgroundColor: colors.bg,
      borderRadius: theme.borderRadius.md,
      paddingVertical: sizeConfig.paddingVertical,
      paddingHorizontal: sizeConfig.paddingHorizontal,
      alignItems: 'center',
      justifyContent: 'center',
      ...theme.shadows.sm,
    },
    text: {
      color: colors.text,
      fontSize: sizeConfig.fontSize,
      fontWeight: '600',
    },
  });
};