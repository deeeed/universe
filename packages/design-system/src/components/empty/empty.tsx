import React, { useMemo } from 'react';
import { Image, ImageSourcePropType, StyleSheet, View } from 'react-native';
import { Button, MD3Theme, Text, useTheme } from 'react-native-paper';

const getItemStyle = (_: { theme: MD3Theme }) => {
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
  buttonProps?: Omit<
    React.ComponentProps<typeof Button>,
    'children' | 'onPress'
  >;
  onPress?: () => void;
  style?: {
    container?: object;
    image?: object;
  };
}

export const Empty = ({
  message,
  onPress,
  buttonValue,
  image,
  buttonProps = {},
  style = {},
}: EmptyProps) => {
  const theme = useTheme();
  const styles = useMemo(() => getItemStyle({ theme }), [theme]);

  return (
    <View style={[styles.container, style.container]}>
      <Image
        source={image}
        style={[styles.image, style.image]}
        resizeMode="contain"
      />
      <Text variant="labelMedium">{message}</Text>
      {buttonValue && (
        <Button onPress={onPress} {...buttonProps}>
          {buttonValue}
        </Button>
      )}
    </View>
  );
};
