import React from 'react';
import { TextInput } from '../TextInput/TextInput';
import { TextInput as PTextInput } from 'react-native-paper';
export interface LockInputProps {
  locked: boolean;
  label?: string;
  text: string;
  onPress?: () => void;
  testID?: string;
}

export const LockInput = ({
  locked,
  label,
  text,
  onPress,
  testID,
}: LockInputProps) => {
  return (
    <TextInput
      label={label}
      value={text}
      disabled={locked}
      testID={testID}
      right={
        <PTextInput.Icon
          icon={locked ? 'lock' : 'lock-open-variant-outline'}
          onPress={onPress}
          testID={`${testID}-lock-icon`}
        />
      }
    />
  );
};
