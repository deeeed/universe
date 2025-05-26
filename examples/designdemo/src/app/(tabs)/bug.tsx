import {
  EditableInfoCard,
  Picker,
  SelectOption,
  ThemeConfig,
  useModal,
  useThemePreferences,
} from "@siteed/design-system/src";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Text, TextInput } from "react-native-paper";

const getStyles = () => {
  return StyleSheet.create({
    container: {
      padding: 20,
    },
    parentStateBox: {
      backgroundColor: "#f0f0f0",
      padding: 10,
      marginVertical: 10,
      borderRadius: 5,
    },
    modalStateBox: {
      backgroundColor: "#e0f0e0",
      padding: 10,
      marginVertical: 10,
      borderRadius: 5,
    },
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
  const [parentRenderCount, setParentRenderCount] = useState(0);
  const [parentInput, setParentInput] = useState("");
  const parentRenderRef = useRef(0);

  // Track parent renders
  useEffect(() => {
    parentRenderRef.current += 1;
    console.log(
      `[PARENT] Component rendered: ${parentRenderRef.current} times`,
    );
  });

  // Update the display count separately to avoid infinite loop
  useEffect(() => {
    setParentRenderCount(parentRenderRef.current);
  }, [parentInput, viewType]); // Only update when these change

  return (
    <View style={styles.container}>
      <ThemeConfig colors={colors} />

      <View style={styles.parentStateBox}>
        <Text variant="titleMedium">Parent Component State</Text>
        <Text>Parent render count: {parentRenderCount}</Text>
        <TextInput
          label="Type here to trigger parent re-renders"
          value={parentInput}
          onChangeText={setParentInput}
          mode="outlined"
          style={{ marginTop: 10 }}
        />
      </View>

      <Button
        onPress={() => {
          setViewType(viewType === "view" ? "scroll" : "view");
        }}
      >
        Toggle View Type: {viewType}
      </Button>

      <Button
        mode="contained"
        onPress={() => {
          console.log("[PARENT] Opening drawer...");
          openDrawer({
            footerType: "confirm_cancel",
            containerType: viewType === "view" ? "view" : "scrollview",
            bottomSheetProps: {
              // enableDynamicSizing: true,
              // snapPoints: [],
              // backdropComponent: undefined,
            },
            render: ({ onChange, state, resolve }) => {
              console.log("[DRAWER] Render function called");
              return (
                <InnerComponent
                  onChange={onChange}
                  footerHeight={state.footerHeight}
                  parentRenderCount={parentRenderCount}
                  resolve={resolve}
                />
              );
            },
            renderFooter: ({ state }) => (
              <View style={{ backgroundColor: "green", padding: 20 }}>
                <Text>FOOTER here</Text>
                <Text>footerHeight: {state.footerHeight}</Text>
                <Text>data: {JSON.stringify(state.data)}</Text>
              </View>
            ),
          });
        }}
        style={{ marginTop: 10 }}
      >
        Open Drawer (Check Console)
      </Button>

      <Button
        onPress={() => {
          openDrawer({
            footerType: "confirm_cancel",
            containerType: "scrollview",
            title: "Long Scrolling Content",
            bottomSheetProps: {
              enableDynamicSizing: true,
            },
            render: ({ onChange, state }) => (
              <LongScrollContent
                onChange={onChange}
                footerHeight={state.footerHeight}
              />
            ),
          });
        }}
        style={{ marginTop: 10 }}
      >
        Test Long Scroll
      </Button>

      <Button
        mode="contained"
        onPress={async () => {
          console.log("[TEST] Opening EditableInfoCard test drawer...");

          // Simulate a recording object
          const recording = {
            title: "jfk.wavdfdfdfaaatttteee",
            description: "Test recording description",
            duration: 120,
            createdAt: new Date().toISOString(),
          };

          const result = await openDrawer({
            initialData: recording,
            title: "Edit Recording",
            footerType: "confirm_cancel",
            render: ({ state, onChange }) => {
              console.log(
                "[DRAWER] Recording edit form render, state:",
                state.data,
              );
              return (
                <RecordingEditForm
                  recording={state.data}
                  updateRecording={async (params) => {
                    console.log("[FORM] updateRecording called with:", params);
                    const newRecording = { ...state.data, ...params.data };
                    console.log(
                      "[FORM] Calling onChange with new recording:",
                      newRecording,
                    );
                    onChange(newRecording);
                    return newRecording;
                  }}
                />
              );
            },
          });

          console.log("[TEST] Drawer closed with result:", result);
        }}
        style={{ marginTop: 10 }}
      >
        Test EditableInfoCard Bug (Recording Edit)
      </Button>
    </View>
  );
};

interface InnerComponentProps {
  onChange?: (value: unknown) => void;
  footerHeight?: number;
  parentRenderCount?: number;
  resolve?: (value: unknown) => void;
}

const InnerComponent = ({
  onChange,
  footerHeight,
  parentRenderCount,
  resolve,
}: InnerComponentProps) => {
  const { theme } = useThemePreferences();
  const [date, setDate] = useState(new Date());
  const { editProp } = useModal();
  const [title, setTitle] = useState("Title");
  const [modalInput, setModalInput] = useState("");
  const [modalRenderCount, setModalRenderCount] = useState(0);
  const modalRenderRef = useRef(0);
  const mountTimeRef = useRef(Date.now());
  const [options, setOptions] = useState<SelectOption[]>([
    { label: "Option 1", value: "1" },
    { label: "Option 2", value: "2" },
    { label: "Option 3", value: "3" },
  ]);

  // Track modal renders
  useEffect(() => {
    modalRenderRef.current += 1;
    console.log(
      `[MODAL] InnerComponent rendered: ${modalRenderRef.current} times`,
    );
  });

  // Update the display count separately to avoid infinite loop
  useEffect(() => {
    setModalRenderCount(modalRenderRef.current);
  }, [modalInput, title, date]); // Only update when these change

  // Track mount/unmount
  useEffect(() => {
    const mountTime = Date.now();
    console.log(`[MODAL] InnerComponent MOUNTED at ${mountTime}`);

    return () => {
      console.log(
        `[MODAL] InnerComponent UNMOUNTED after ${Date.now() - mountTime}ms`,
      );
    };
  }, []);

  return (
    <View>
      <View
        style={{
          backgroundColor: "#e0f0e0",
          padding: 10,
          marginBottom: 10,
          borderRadius: 5,
        }}
      >
        <Text variant="titleMedium">Modal Component State</Text>
        <Text>Modal render count: {modalRenderCount}</Text>
        <Text>Parent render count when opened: {parentRenderCount}</Text>
        <Text>
          Component age:{" "}
          {Math.floor((Date.now() - mountTimeRef.current) / 1000)}s
        </Text>
      </View>

      <TextInput
        label="Type here - should NOT recreate modal"
        value={modalInput}
        onChangeText={(text) => {
          console.log(`[MODAL] Input changed to: "${text}"`);
          setModalInput(text);
          onChange?.({ modalInput: text });
        }}
        mode="outlined"
        style={{ marginBottom: 10 }}
      />

      <Text>Inner Component</Text>
      <Text>footerHeight: {footerHeight}</Text>

      <Button
        onPress={() => {
          console.log("[MODAL] Change button pressed");
          onChange?.("test");
        }}
      >
        Change Data
      </Button>

      <Button
        mode="outlined"
        onPress={() => {
          console.log("[MODAL] Closing modal with data");
          resolve?.({ modalInput, title, date });
        }}
        style={{ marginTop: 10 }}
      >
        Close Modal with Data
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

interface LongScrollContentProps {
  onChange?: (value: unknown) => void;
  footerHeight?: number;
}

const LongScrollContent = ({ footerHeight }: LongScrollContentProps) => {
  const { theme } = useThemePreferences();

  // Create an array of 50 items for testing
  const items = Array.from({ length: 50 }, (_, index) => index + 1);

  return (
    <View style={{ paddingHorizontal: 16 }}>
      {items.map((item) => (
        <View
          key={item}
          style={{
            padding: 16,
            backgroundColor: theme.colors.surface,
            marginVertical: 8,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: theme.colors.outline,
          }}
        >
          <Text>Item #{item}</Text>
          <Text>This is a test item to demonstrate the scrolling issue</Text>
          <Text>Footer height: {footerHeight}</Text>
        </View>
      ))}
    </View>
  );
};

interface RecordingData {
  title: string;
  description: string;
  duration: number;
  createdAt: string;
}

interface RecordingEditFormProps {
  recording: RecordingData;
  updateRecording: (params: {
    data: Partial<RecordingData>;
  }) => Promise<RecordingData>;
}

const RecordingEditForm = ({
  recording,
  updateRecording,
}: RecordingEditFormProps) => {
  const { theme } = useThemePreferences();
  const [localTitle, setLocalTitle] = useState(recording.title);

  console.log("[RecordingEditForm] Rendered with recording:", recording);

  return (
    <View style={{ padding: 16 }}>
      <Text variant="titleMedium" style={{ marginBottom: 16 }}>
        Edit Recording Details
      </Text>

      <EditableInfoCard
        label="Title"
        value={recording.title}
        containerStyle={{
          backgroundColor: theme.colors.surface,
          marginBottom: 12,
        }}
        editable
        inlineEditable
        onInlineEdit={async (newValue) => {
          console.log("[EditableInfoCard] onInlineEdit called with:", newValue);
          const stringValue = String(newValue || "");
          setLocalTitle(stringValue);
          await updateRecording({ data: { title: stringValue } });
          console.log("[EditableInfoCard] updateRecording completed");
        }}
      />

      <EditableInfoCard
        label="Description"
        value={recording.description}
        containerStyle={{
          backgroundColor: theme.colors.surface,
          marginBottom: 12,
        }}
        editable
        inlineEditable
        multiline
        numberOfLines={3}
        onInlineEdit={async (newValue) => {
          console.log(
            "[EditableInfoCard] Description onInlineEdit called with:",
            newValue,
          );
          const stringValue = String(newValue || "");
          await updateRecording({ data: { description: stringValue } });
        }}
      />

      <EditableInfoCard
        label="Duration"
        value={`${recording.duration} seconds`}
        containerStyle={{
          backgroundColor: theme.colors.surface,
          marginBottom: 12,
        }}
        editable={false}
      />

      <EditableInfoCard
        label="Created At"
        value={new Date(recording.createdAt).toLocaleString()}
        containerStyle={{
          backgroundColor: theme.colors.surface,
          marginBottom: 12,
        }}
        editable={false}
      />

      <View
        style={{
          padding: 10,
          backgroundColor: theme.colors.surfaceVariant,
          borderRadius: 8,
          marginTop: 16,
        }}
      >
        <Text variant="bodySmall">Current State:</Text>
        <Text variant="bodySmall">Title: {recording.title}</Text>
        <Text variant="bodySmall">Local Title: {localTitle}</Text>
        <Text variant="bodySmall">Description: {recording.description}</Text>
      </View>
    </View>
  );
};

export default Bug;
