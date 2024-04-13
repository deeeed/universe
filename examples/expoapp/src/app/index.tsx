import {
  Button,
  LockInput,
  ScreenWrapper,
  ThemeConfig,
  useConfirm,
  useScreenWidth,
  useThemePreferences,
  useToast,
} from "@siteed/design-system";
import { Link } from "expo-router";
import { Text, View } from "react-native";

export default function Page() {
  const { theme, darkMode, toggleDarkMode } = useThemePreferences();
  const width = useScreenWidth();
  const confirm = useConfirm();
  const { show } = useToast();

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
      <Button
        onPress={async () => {
          const confirmed = await confirm({ title: "Confirm ?" });

          show({
            message: `Confirmed: ${confirmed}`,
            iconVisible: true,
            type: confirmed ? "success" : "error",
            onDismiss() {
              console.log("dismissed");
            },
          });
        }}
      >
        Confirm Now
      </Button>
      <LockInput text="ok" locked />
    </ScreenWrapper>
  );
}
