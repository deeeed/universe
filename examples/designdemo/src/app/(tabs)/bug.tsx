import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import {
  ThemeConfig,
  useModal,
  useThemePreferences,
} from "@siteed/design-system/src";
import React, { useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Text } from "react-native-paper";

import { Form1 } from "../../components/form1";

const getStyles = () => {
  return StyleSheet.create({
    container: {},
  });
};

export const Bug = () => {
  const styles = useMemo(() => getStyles(), []);
  const { theme } = useThemePreferences();
  const colors = [
    theme.colors.primary,
    theme.colors.secondary,
    theme.colors.tertiary,
  ];

  const { openDrawer } = useModal();
  const [viewType, setViewType] = useState<"view" | "scroll">("view");
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);

  return (
    <View style={styles.container}>
      <ThemeConfig colors={colors} />
      <Button
        onPress={() => {
          setViewType(viewType === "view" ? "scroll" : "view");
        }}
      >
        {viewType}
      </Button>
      <Button
        onPress={() => {
          openDrawer({
            footerType: "confirm_cancel",
            containerType: viewType === "view" ? "view" : "scrollview",
            bottomSheetProps: {
              enableDynamicSizing: true,
              snapPoints: [],
              backdropComponent: undefined,
            },
            render: ({ onChange }) => (
              <>
                <Form1 label="Form 1" onChange={onChange} />
                <View
                  style={{ backgroundColor: "green", padding: 20, flex: 1 }}
                >
                  <Text>FOOTER here</Text>
                </View>
              </>
            ),
          });
        }}
      >
        drawer
      </Button>
      <Button
        onPress={() => {
          bottomSheetModalRef.current?.present();
        }}
      >
        Open
      </Button>
      <BottomSheetModal
        ref={bottomSheetModalRef}
        enableDynamicSizing
        // snapPoints={["20%", "60%"]}
        backdropComponent={(props) => <BottomSheetBackdrop {...props} />}
        footerComponent={() => (
          <View style={{ backgroundColor: "green", padding: 20 }}>
            <Text>FOOTER here</Text>
          </View>
        )}
      >
        <BottomSheetView>
          <Form1 label="Form 1" />
        </BottomSheetView>
      </BottomSheetModal>
    </View>
  );
};

export default Bug;
