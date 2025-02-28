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
  testID?: string;
}

export const HelperWrapper = ({
  children,
  iconPosition = 'left',
  iconColor,
  helperText,
  visible = true,
  testID,
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
        <View style={styles.modalInner} testID={`${testID}-modal-content`}>
          <HelperText
            text={helperText}
            maxLines={10}
            testID={`${testID}-modal-helper-text`}
          />
          <View
            style={styles.buttonContainer}
            testID={`${testID}-modal-button-container`}
          >
            <Button
              mode="outlined"
              onPress={() => resolve?.(true)}
              style={styles.modalButton}
              testID={`${testID}-modal-ok-button`}
            >
              Ok
            </Button>
          </View>
        </View>
      ),
    });
  };

  const iconElement = (
    <TouchableOpacity
      onPress={handleIconPress}
      style={styles.iconContainer}
      testID={`${testID}-icon-button`}
    >
      <Ionicons
        name="information-circle-outline"
        size={24}
        color={iconColor || theme.colors.primary}
        testID={`${testID}-icon`}
      />
    </TouchableOpacity>
  );

  if (!visible) {
    return children;
  }

  return (
    <View style={styles.container} testID={testID}>
      {iconPosition === 'left' && iconElement}
      <View
        style={styles.childrenContainer}
        testID={`${testID}-children-container`}
      >
        {children}
      </View>
      {iconPosition === 'right' && iconElement}
    </View>
  );
};
