import { FontAwesome } from "@expo/vector-icons";
import {
  BottomSheetBackdrop,
  BottomSheetFooter,
  BottomSheetModal,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import {
  Accordion,
  AccordionItemProps,
  TextInput,
  ThemeConfig,
  useModal,
  useThemePreferences,
} from "@siteed/design-system/src";
import { useNavigation } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Button, Text } from "react-native-paper";

import { Form1 } from "../../components/form1";

const getStyles = () => {
  return StyleSheet.create({
    container: {},
  });
};

const renderMany = () => {
  const items = [];
  for (let i = 0; i < 100; i++) {
    items.push(<Text key={i}>Item {i}</Text>);
  }
  return items;
};

const accordionData: AccordionItemProps[] = [
  {
    title: "Accordion Item 1",
    children: <Text>Content 1</Text>,
  },
  {
    title: "Accordion Item 2",
    children: <View>{renderMany()}</View>,
  },
  {
    title: "Accordion Item 3",
    children: <Text>Content 3</Text>,
  },
];

export const Bug = () => {
  const styles = useMemo(() => getStyles(), []);
  const { theme } = useThemePreferences();
  const navigation = useNavigation();
  const colors = [
    theme.colors.primary,
    theme.colors.secondary,
    theme.colors.tertiary,
  ];

  const { openDrawer } = useModal();
  const [viewType, setViewType] = useState<"view" | "scroll">("view");
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);

  useEffect(() => {
    // Set navbar title
    navigation.setOptions({
      headerShow: true,
      // headerTitle: "Recording",
      headerTitle: ({ tintColor }: { tintColor: string }) => {
        return (
          <Text style={{ fontSize: 16, fontWeight: "bold", color: tintColor }}>
            Recording
          </Text>
        );
      },
      headerRight: () => (
        <Pressable
          style={{ padding: 10 }}
          onPress={async () => {
            await openDrawer({
              bottomSheetProps: {
                enableDynamicSizing: true,
                snapPoints: [],
              },
              render: () => <Accordion data={accordionData} />,
            });
          }}
        >
          <FontAwesome name="cog" size={24} color={theme.colors.text} />
        </Pressable>
      ),
    });
  }, [navigation, openDrawer]);

  const openAccordion = async () => {
    try {
      await openDrawer({
        bottomSheetProps: {
          enableDynamicSizing: true,
          snapPoints: [],
        },
        render: () => (
          <View>
            <TextInput label="Name" />
            <Accordion data={accordionData} />
          </View>
        ),
      });
    } catch (error) {
      console.log(error);
    }
  };
  return (
    <View style={styles.container}>
      <ThemeConfig colors={colors} />
      <Button onPress={openAccordion}>Open Accordion</Button>
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
              footerComponent: () => (
                <View style={{ backgroundColor: "green", padding: 20 }}>
                  <Text>FOOTER here</Text>
                </View>
              ),
            },
            render: ({ onChange }) => (
              <View>
                <Form1 label="Form 1" onChange={onChange} />
                <View
                  style={{ backgroundColor: "green", padding: 20, flex: 1 }}
                >
                  <Text>FOOTER here</Text>
                </View>
              </View>
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
        footerComponent={(props) => (
          <BottomSheetFooter
            {...props}
            style={{ backgroundColor: "green", padding: 20 }}
          >
            <Text>FOOTER here</Text>
          </BottomSheetFooter>
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
