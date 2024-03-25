import React from "react"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import {
  ThemeActions,
  ThemePreferences,
} from "../hooks/use-app-preferences-setup"
import { CustomBottomSheetModal } from "./custom-bottomsheet-provider"
import { LanguageProvider } from "./language-provider"
import { ThemeProvider } from "./theme-provider"

export const UIProvider = ({
  locale,
  preferences,
  children,
}: {
  children: React.ReactNode;
  preferences: ThemePreferences & ThemeActions;
  locale?: string;
}) => {
  return (
    <LanguageProvider locale={locale}>
      <ThemeProvider preferences={preferences}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <CustomBottomSheetModal>{children}</CustomBottomSheetModal>
        </GestureHandlerRootView>
      </ThemeProvider>
    </LanguageProvider>
  )
}
