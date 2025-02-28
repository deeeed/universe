import React from 'react';
import { Text as PaperText, TextProps } from 'react-native-paper';

export interface ExtendedTextProps extends TextProps<string> {
  testID?: string;
}

export const Text = ({ testID, ...props }: ExtendedTextProps) => (
  <PaperText testID={testID} {...props} />
);
