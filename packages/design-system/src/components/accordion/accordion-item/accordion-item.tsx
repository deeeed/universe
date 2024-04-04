import React, { useMemo } from "react"
import { Pressable, StyleProp, StyleSheet, TextStyle, View } from "react-native"
import { Text } from "react-native-paper"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import { useTheme } from "../../../providers/theme-provider"
import { AppTheme } from "../../../hooks/use-app-theme-setup"

const getStyles = ({theme}:{theme: AppTheme}) => {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      padding: 12,
      backgroundColor: theme.colors.primaryContainer,
      color: theme.colors.text,
      flex: 1,
      flexDirection: "row",
      justifyContent:"space-between"
    },
    title: {},
    contentContainer: {

    }
  })
}

export interface AccordionItemData {
    title: string, 
    expanded?: boolean, 
    onHeaderPress?: () => void;
}

export interface AccordionItemProps extends AccordionItemData { 
    children: React.ReactNode, 
    titleStyle?: StyleProp<TextStyle>,
    contentContainerStyle?: StyleProp<View>
}
export const AccordionItem = ({ title, titleStyle, contentContainerStyle, children, expanded = false, onHeaderPress }: AccordionItemProps ) => {
  const theme = useTheme()
  const styles = useMemo(() => getStyles({theme}), [theme])

  return <View style={styles.container}>
    <Pressable style={styles.header} onPress={ onHeaderPress }>
      <Text style={[styles.title, titleStyle]}>{ title }</Text>
      <MaterialCommunityIcons name={expanded? "chevron-down" : "chevron-right"} size={24} color="black" />
    </Pressable>
    {expanded && <View style={[styles.contentContainer, contentContainerStyle]}>{ children }</View>}
  </View>
}
