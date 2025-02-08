import React from 'react';
import { Text as PaperText, TextProps } from 'react-native-paper';

export const Text = (props: TextProps<string>) => <PaperText {...props} />;
