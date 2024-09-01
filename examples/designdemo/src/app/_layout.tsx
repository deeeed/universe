import { UIProvider } from "@siteed/design-system";
import { Drawer } from "expo-router/drawer";

export const unstable_settings = {
  initialRouteName: "(tabs)", // always go back to the tabs screen
};

export default function HomeLayout() {
  return (
    <UIProvider
      toastProviderProps={{
        overrides: {
          snackbarStyle: { marginBottom: 100 },
        },
      }}
    >
      <Drawer screenOptions={{ headerShown: true }}>
        <Drawer.Screen name="(tabs)" />
      </Drawer>
    </UIProvider>
  );
}
