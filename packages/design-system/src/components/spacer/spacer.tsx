import React from 'react';
import { View } from 'react-native';

type SpacerProps = {
  horizontal?: number;
  vertical?: number;
};

const Spacer = ({ horizontal, vertical }: SpacerProps) => (
  <View style={{ paddingHorizontal: horizontal, paddingVertical: vertical }} />
);

export { Spacer };
