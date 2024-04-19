import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

const getStyles = () => {
  return StyleSheet.create({
    container: {},
  });
};

export interface AvatarProps {
  id: string;
}
export const Avatar = ({ id }: AvatarProps) => {
  const styles = useMemo(() => getStyles(), []);

  return (
    <View style={styles.container}>
      <Text>TODO {id}</Text>
    </View>
  );
};
