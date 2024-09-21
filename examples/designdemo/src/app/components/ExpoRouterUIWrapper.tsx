import {
  BottomSheetContext,
  BottomSheetProvider,
  useModal,
} from "@siteed/design-system";
import React, { useMemo } from "react";

interface ExpoRouterUIWrapperProps {
  children: React.ReactNode;
}

export const ExpoRouterUIWrapper: React.FC<ExpoRouterUIWrapperProps> = ({
  children,
}) => {
  const { openDrawer, dismiss, dismissAll, modalStack } = useModal();

  const contextValue = useMemo(
    () => ({
      openDrawer,
      dismiss,
      dismissAll,
      modalStack,
    }),
    [openDrawer, dismiss, dismissAll, modalStack],
  );

  return (
    <BottomSheetContext.Provider value={contextValue}>
      <BottomSheetProvider>{children}</BottomSheetProvider>
    </BottomSheetContext.Provider>
  );
};
