import {
  DarkTheme,
  DefaultTheme,
  useTheme as useNavigationTheme
} from "@react-navigation/native";
import {
  LockInput,
  ScreenWrapper,
  useScreenWidth,
  useThemePreferences
} from "@siteed/design-system";
import { ScrollView, Text, View } from "react-native";

export default function Page() {
  const navTheme = useNavigationTheme();
  const { theme, darkMode, toggleDarkMode } = useThemePreferences();
  const width = useScreenWidth();
  return (
    <ScreenWrapper>
      <View style={{ flex: 1 }}>
        <Text>Default Theme Background: {DefaultTheme.colors.background}</Text>
        <Text>Dark Theme Background: {DarkTheme.colors.background}</Text>
        <Text>NavTheme background: {navTheme.colors.background}</Text>
        <Text>Theme Background: {theme.colors.background}</Text>
        <ScrollView style={{ height: 200 }}>
          <Text>{JSON.stringify(theme, null, 2)}</Text>
        </ScrollView>
        <Text>Width: {width}</Text>
      </View>
      <Text>Home page</Text>
      <LockInput text="ok" locked />
    </ScreenWrapper>
  );
}
