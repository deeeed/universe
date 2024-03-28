import React from "react"
import { TextInput } from "react-native-paper"

export interface LockInputProps {
  locked: boolean;
  label?: string;
  text: string;
  onPress?: () => void;
}

export const LockInput = ({ locked, label, text, onPress }: LockInputProps) => {
  return (
    <TextInput
      label={label}
      value={text}
      disabled={locked}
      right={
        <TextInput.Icon
          icon={locked ? "lock" : "lock-open-variant-outline"}
          onPress={onPress}
        />
      }
    />
  )
}
