import React from 'react';
import { Text } from 'react-native';

export interface RefreshControlWebProps {
  refreshing: boolean;
  children: React.ReactNode;
}

export const RefreshControlWeb: React.FC<RefreshControlWebProps> = ({
  refreshing,
  children,
}) => {
  if (refreshing) return <Text>Refreshing...</Text>;

  return <>{children}</>;
};
