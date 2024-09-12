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
import React, { useMemo, useRef } from "react";
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
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);

  return (
    <View style={styles.container}>
      <ThemeConfig colors={colors} />
      <Button
        onPress={() => {
          openDrawer({
            bottomSheetProps: {
              index: 0,
              enableDynamicSizing: true,
              backdropComponent: undefined,
            },
            renderFooter: ({ onChange, footerComponent }) => (
              <View>
                {footerComponent}
                <Button onPress={() => onChange({ someValue: "updated" })}>
                  Update Value
                </Button>
              </View>
            ),
            render: ({ onChange }) => (
              <Form1 label="Form 1" onChange={onChange} />
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
        enableDynamicSizing={false}
        snapPoints={["20%", "60%"]}
        backdropComponent={(props) => <BottomSheetBackdrop {...props} />}
        footerComponent={() => (
          <View
            style={{
              backgroundColor: "blue",
              padding: 30,
            }}
          >
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
