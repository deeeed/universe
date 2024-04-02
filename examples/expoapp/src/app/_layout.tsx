import { UIProvider, useScreenWidth } from "@siteed/design-system";
import { LoggerProvider, useLoggerActions } from "@siteed/react-native-logger";
import { Slot } from "expo-router";
import { useEffect } from "react";
import { Text, View } from "react-native";

const WithLogger = ({ children }: { children: React.ReactNode }) => {
  const { logger } = useLoggerActions("GoodApp");
  const width = useScreenWidth();

  useEffect(() => {
    logger.info("App started");
  }, [logger]);

  return (
    <View>
      <Text>Width: {width}</Text>
      {children}
    </View>
  );
};

export default function HomeLayout() {
  return (
    <LoggerProvider>
      <UIProvider>
        <Slot />
      </UIProvider>
    </LoggerProvider>
  );
}
