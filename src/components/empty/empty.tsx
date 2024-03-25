import React, { useMemo } from 'react';
import { Image, ImageSourcePropType, StyleSheet, View } from 'react-native';
import { Button, MD3Theme, Text, useTheme } from 'react-native-paper';

const getItemStyle = ({}: { theme: MD3Theme }) => {
  return StyleSheet.create({
    container: {
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      flexGrow: 1,
      display: 'flex',
      gap: 20,
      marginTop: 20,
    },
    image: {
      height: 200,
      width: 200,
      padding: 5,
    },
  });
};

export interface EmptyProps {
  image: ImageSourcePropType;
  message: string;
  buttonValue: string;
  onPress?: () => void;
}

export const Empty = ({ message, onPress, buttonValue, image }: EmptyProps) => {
  const theme = useTheme();
  const styles = useMemo(() => getItemStyle({ theme }), [theme]);

  return (
    <View style={styles.container}>
      <Image source={image} style={styles.image} resizeMode="contain" />
      <Text variant="labelMedium">{message}</Text>
      {buttonValue && <Button onPress={onPress}>{buttonValue}</Button>}
    </View>
  );
};
