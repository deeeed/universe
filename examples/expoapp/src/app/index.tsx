import {
  DarkTheme,
  DefaultTheme,
  useTheme as useNavigationTheme,
} from "@react-navigation/native";
import {
  LockInput,
  ScreenWrapper,
  useScreenWidth,
  useThemePreferences,
} from "@siteed/design-system";
import { Link } from "expo-router";
import { ScrollView, Text, View } from "react-native";

export default function Page() {
  const navTheme = useNavigationTheme();
  const { theme, darkMode, toggleDarkMode } = useThemePreferences();
  const width = useScreenWidth();
  return (
    <ScreenWrapper>
      <View style={{ flex: 1 }}>
        <Link href="/(tabs)">Go to Tabs</Link>
        <Text>Width: {width}</Text>
      </View>
      <LockInput text="ok" locked />
    </ScreenWrapper>
  );
}
