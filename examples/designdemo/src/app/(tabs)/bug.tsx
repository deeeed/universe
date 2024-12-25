import {
  EditableInfoCard,
  Picker,
  SelectOption,
  ThemeConfig,
  useModal,
  useThemePreferences,
} from "@siteed/design-system/src";
import React, { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Text } from "react-native-paper";

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
              // enableDynamicSizing: true,
              // snapPoints: [],
              // backdropComponent: undefined,
            },
            render: ({ onChange, state }) => (
              <InnerComponent
                onChange={onChange}
                footerHeight={state.footerHeight}
              />
            ),
            renderFooter: ({ state }) => (
              <View style={{ backgroundColor: "green", padding: 20 }}>
                <Text>FOOTER here</Text>
                <Text>footerHeight: {state.footerHeight}</Text>
                <Text>data: {JSON.stringify(state.data)}</Text>
              </View>
            ),
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
  footerHeight?: number;
}
const InnerComponent = ({ onChange, footerHeight }: InnerComponentProps) => {
  const { theme } = useThemePreferences();
  const [date, setDate] = useState(new Date());
  const { editProp } = useModal();
  const [title, setTitle] = useState("Title");
  const [options, setOptions] = useState<SelectOption[]>([
    { label: "Option 1", value: "1" },
    { label: "Option 2", value: "2" },
    { label: "Option 3", value: "3" },
  ]);
  return (
    <View>
      <Text>Inner Component</Text>
      <Text>footerHeight: {footerHeight}</Text>
      <Button
        onPress={() => {
          console.log("onPress", onChange);
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
          console.debug("BUG -> startedit");
          const newTitle = await editProp({
            data: title,
            inputType: "text",
            modalType: "drawer",
            initiallyOpen: true,
            showFooter: false,
            modalProps: {
              closeOnOutsideTouch: false,
              showBackdrop: false,
            },
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
            setDate(new Date(newDate as string));
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
          console.log("EditableInfoCard onEdit called");
          const newDate = await editProp({
            data: date,
            inputType: "time",
            initiallyOpen: true,
            showFooter: false,
          });
          console.log("EditableInfoCard onEdit received newDate:", newDate);
          if (newDate) {
            console.log("EditableInfoCard setting new date");
            setDate(new Date(newDate as string));
          }
        }}
      />
      <View>
        <Text>Inner Inner Component</Text>
        <Text>{JSON.stringify(options)}</Text>
        <Picker
          label="Picker"
          showCreateOptionButton
          options={options}
          onFinish={(values) => {
            console.log("Picker value changed to:", values);
            setOptions(values);
          }}
        />
        <Text>After picker</Text>
      </View>
    </View>
  );
};

export default Bug;
