import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

const getStyles = () => {
  return StyleSheet.create({
    container: {},
  });
};

export interface AvatarProps {
  id: string;
  testID?: string;
}
export const Avatar = ({ id, testID }: AvatarProps) => {
  const styles = useMemo(() => getStyles(), []);

  return (
    <View style={styles.container} testID={testID}>
      <Text testID={testID ? `${testID}-text` : undefined}>TODO {id}</Text>
    </View>
  );
};
