import {
  LockInput,
  ScreenWrapper,
  ThemeConfig,
  useScreenWidth,
  useThemePreferences,
} from "@siteed/design-system";
import { Link } from "expo-router";
import { Text, View } from "react-native";

export default function Page() {
  const { theme, darkMode, toggleDarkMode } = useThemePreferences();
  const width = useScreenWidth();

  const colors = [
    theme.colors.primary,
    theme.colors.secondary,
    theme.colors.tertiary,
  ];

  return (
    <ScreenWrapper withScrollView style={{ paddingTop: 50 }}>
      <View style={{ flex: 1 }}>
        <ThemeConfig colors={colors} />
        <Link href="/(tabs)">Go to Tabs</Link>
        <Text>Width: {width}</Text>
      </View>
      <LockInput text="ok" locked />
    </ScreenWrapper>
  );
}
