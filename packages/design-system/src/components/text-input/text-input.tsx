import React from "react"
import { TextInput as PTextInput, TextInputProps as PTextInputProps, Text } from "react-native-paper"
import { useTheme } from "../../providers/theme-provider"

export interface TextInputProps extends PTextInputProps {
    mandatory?: boolean
}
export const TextInput = ({mandatory, label, ...rest}: TextInputProps) => {
  const { colors } = useTheme()

  if(mandatory) {
    return <PTextInput 
      {...rest} 
      style={{backgroundColor: colors.background, color: colors.text}}
      label={<Text>
        {label}
        <Text style={{color: "red", paddingLeft: 5}}>*</Text>
      </Text>}
    />
  }


  return <PTextInput {...rest} label={label} />
}
