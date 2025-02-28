import React from 'react';
import { Button as PaperButton, ButtonProps } from 'react-native-paper';

// Define extended props to include testID
export interface ExtendedButtonProps extends ButtonProps {
  testID?: string;
}

export const Button = ({ testID, ...props }: ExtendedButtonProps) => (
  <PaperButton testID={testID} {...props} />
);
