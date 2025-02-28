import React from 'react';
import { View } from 'react-native';

type SpacerProps = {
  horizontal?: number;
  vertical?: number;
  testID?: string;
};

const Spacer = ({ horizontal, vertical, testID }: SpacerProps) => (
  <View
    style={{ paddingHorizontal: horizontal, paddingVertical: vertical }}
    testID={testID}
  />
);

export { Spacer };
