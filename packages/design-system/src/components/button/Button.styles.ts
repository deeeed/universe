import { StyleSheet, TextStyle } from 'react-native';

export const buttonSizeValues = ['small', 'medium', 'large'] as const;

export type Size = (typeof buttonSizeValues)[number];

export const getButtonStyles = () => {
  return StyleSheet.create({
    container: {
      flex: 1,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      textAlign: 'center',
      alignSelf: 'flex-start',
      backgroundColor: '#16a085',
      borderRadius: 20,
    },
    text: {
      padding: 10,
      color: 'white',
    } as TextStyle,
  });
};
