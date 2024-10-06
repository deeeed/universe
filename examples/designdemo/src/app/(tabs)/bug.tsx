import { FontAwesome } from "@expo/vector-icons";
import {
  Accordion,
  AccordionItemProps,
  EditableInfoCard,
  TextInput,
  ThemeConfig,
  useModal,
  useThemePreferences,
} from "@siteed/design-system/src";
import { useNavigation } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Button, Text } from "react-native-paper";

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
            render: ({ onChange }) => <InnerComponent onChange={onChange} />,
          });
        }}
      >
        drawer
      </Button>
    </View>
  );
};

interface InnerComponentProps {
  onChange?: (value: unknown) => void;
}
const InnerComponent = ({ onChange }: InnerComponentProps) => {
  const { theme } = useThemePreferences();
  const [date, setDate] = useState(new Date());
  const { editProp } = useModal();
  const [title, setTitle] = useState("Title");
  return (
    <View>
      <Text>Inner Component</Text>
      <Button
        onPress={() => {
          onChange?.("test");
        }}
      >
        Change
      </Button>
      <EditableInfoCard
        label="Title"
        value={title}
        containerStyle={{ backgroundColor: theme.colors.surface }}
        editable
        onEdit={async () => {
          console.log("edit");
          const newTitle = await editProp({
            data: title,
            inputType: "text",
            modalType: "modal",
            initiallyOpen: true,
            showFooter: false,
          });
          if (newTitle) {
            setTitle(newTitle as string);
          }
        }}
      />
      <EditableInfoCard
        value={date}
        label="Date"
        containerStyle={{ backgroundColor: theme.colors.surface }}
        renderValue={(value) => {
          const date = new Date(value as Date);
          const formattedDate = date.toLocaleDateString();
          return <Text>{formattedDate}</Text>;
        }}
        editable
        onEdit={async () => {
          console.log("edit");
          const newDate = await editProp({
            data: date,
            inputType: "date",
            modalType: "modal",
            initiallyOpen: true,
            showFooter: false,
          });
          console.log(`newDate: ${newDate}`);
          if (newDate) {
            setDate(newDate as Date);
          }
        }}
      />
      <EditableInfoCard
        value={date}
        label="Time"
        containerStyle={{ backgroundColor: theme.colors.surface }}
        renderValue={(value) => {
          const date = new Date(value as Date);
          const formattedDate = date.toLocaleTimeString();
          return <Text>{formattedDate}</Text>;
        }}
        editable
        onEdit={async () => {
          const newDate = await editProp({
            data: date,
            inputType: "time",
            initiallyOpen: true,
            showFooter: false,
          });
          if (newDate) {
            setDate(newDate as Date);
          }
        }}
      />
      <View style={{ height: 100 }}>
        <Text>Inner Inner Component</Text>
      </View>
    </View>
  );
};

export default Bug;
