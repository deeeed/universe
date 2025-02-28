import React from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';

interface DividerProps extends Pick<ViewProps, 'testID'> {
  testID?: string;
}

const Divider = ({ testID }: DividerProps) => (
  <View style={styles.container} testID={testID} />
);

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: StyleSheet.hairlineWidth,
    // backgroundColor: Colors.background,
  },
});

export { Divider };
