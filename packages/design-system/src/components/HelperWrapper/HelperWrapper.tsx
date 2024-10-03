import { Ionicons } from '@expo/vector-icons';
import React, { ReactNode, useMemo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { AppTheme } from '../../hooks/_useAppThemeSetup';
import { useModal } from '../../hooks/useModal/useModal';
import { Button } from '../Button/Button';
import { HelperText } from '../HelperText/HelperText';
import { useTheme } from '../../providers/ThemeProvider';

const getStyles = ({ theme }: { theme: AppTheme }) => {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    iconContainer: {
      marginLeft: 8,
      marginRight: 8,
      justifyContent: 'center',
    },
    childrenContainer: {
      flex: 1,
    },
    modalContent: {
      padding: 20,
      width: '100%',
    },
    modalInner: {
      gap: 20,
    },
    buttonContainer: {
      alignItems: 'center',
    },
    modalButton: {
      minWidth: 100,
      borderColor: theme.colors.primary,
    },
  });
};

export interface HelperWrapperProps {
  children: ReactNode;
  helperText: string;
  visible?: boolean;
  iconPosition?: 'left' | 'right';
  iconColor?: string;
}

export const HelperWrapper = ({
  children,
  iconPosition = 'left',
  iconColor,
  helperText,
  visible = true,
}: HelperWrapperProps) => {
  const theme = useTheme();
  const styles = useMemo(() => getStyles({ theme }), [theme]);
  const { openModal } = useModal();

  const handleIconPress = () => {
    openModal({
      modalProps: {
        styles: {
          modalContent: styles.modalContent,
        },
      },
      render: ({ resolve }) => (
        <View style={styles.modalInner}>
          <HelperText text={helperText} maxLines={10} />
          <View style={styles.buttonContainer}>
            <Button
              mode="outlined"
              onPress={() => resolve?.(true)}
              style={styles.modalButton}
            >
              Ok
            </Button>
          </View>
        </View>
      ),
    });
  };

  const iconElement = (
    <TouchableOpacity onPress={handleIconPress} style={styles.iconContainer}>
      <Ionicons
        name="information-circle-outline"
        size={24}
        color={iconColor || theme.colors.primary}
      />
    </TouchableOpacity>
  );

  if (!visible) {
    return children;
  }

  return (
    <View style={styles.container}>
      {iconPosition === 'left' && iconElement}
      <View style={styles.childrenContainer}>{children}</View>
      {iconPosition === 'right' && iconElement}
    </View>
  );
};
