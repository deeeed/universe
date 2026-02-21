import {
  BottomSheetModal,
  BottomSheetTextInput,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import {
  EditableInfoCard,
  Picker,
  SelectOption,
  useModal,
  useTheme,
  useThemePreferences,
} from "@siteed/design-system";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Button, Text, TextInput } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ─── Keyboard config types ────────────────────────────────────────────────────

type KeyboardConfigType = {
  label: string;
  keyboardBehavior: "interactive" | "extend" | "fillParent" | undefined;
  keyboardBlurBehavior?: "none" | "restore";
  android_keyboardInputMode: "adjustResize" | "adjustPan" | undefined;
  enableDynamicSizing: boolean;
  snapPoints: string[] | [];
  index?: number;
};

const KEYBOARD_CONFIGS: KeyboardConfigType[] = [
  {
    label: "Config 1: Interactive + adjustResize (dynamic)",
    keyboardBehavior: "interactive",
    keyboardBlurBehavior: "none",
    android_keyboardInputMode: "adjustResize",
    enableDynamicSizing: true,
    snapPoints: [],
  },
  {
    label: "Config 2: Extend + adjustResize (dynamic)",
    keyboardBehavior: "extend",
    keyboardBlurBehavior: "none",
    android_keyboardInputMode: "adjustResize",
    enableDynamicSizing: true,
    snapPoints: [],
  },
  {
    label: "Config 3: Interactive + adjustPan (dynamic)",
    keyboardBehavior: "interactive",
    keyboardBlurBehavior: "none",
    android_keyboardInputMode: "adjustPan",
    enableDynamicSizing: true,
    snapPoints: [],
  },
  {
    label: "Config 4: Fixed 65% height + interactive",
    keyboardBehavior: "interactive",
    keyboardBlurBehavior: "none",
    android_keyboardInputMode: "adjustResize",
    enableDynamicSizing: false,
    snapPoints: ["65%"],
    index: 0,
  },
];

// ─── Styles ───────────────────────────────────────────────────────────────────

const getStyles = () =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 40,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "bold",
      marginTop: 24,
      marginBottom: 8,
    },
    sectionDescription: {
      marginBottom: 12,
      opacity: 0.7,
    },
    divider: {
      height: 1,
      backgroundColor: "#ccc",
      marginVertical: 16,
    },
    stateBox: {
      backgroundColor: "#f0f0f0",
      padding: 10,
      marginVertical: 10,
      borderRadius: 5,
    },
    bottomSheetContent: {
      padding: 16,
    },
    directBtn: {
      marginTop: 16,
      padding: 8,
      borderRadius: 4,
      alignItems: "center",
    },
    directBtnText: {
      color: "white",
      fontWeight: "bold",
    },
  });

// ─── Sub-components ───────────────────────────────────────────────────────────

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

  useEffect(() => {
    modalRenderRef.current += 1;
  });

  useEffect(() => {
    setModalRenderCount(modalRenderRef.current);
  }, [modalInput, title, date]);

  useEffect(() => {
    const mountTime = Date.now();
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
          setModalInput(text);
          onChange?.({ modalInput: text });
        }}
        mode="outlined"
        style={{ marginBottom: 10 }}
      />

      <Text>footerHeight: {footerHeight}</Text>

      <Button
        onPress={() => {
          onChange?.("test");
        }}
      >
        Change Data
      </Button>

      <Button
        mode="outlined"
        onPress={() => {
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
          const d = new Date(value as Date);
          return <Text>{d.toLocaleDateString()}</Text>;
        }}
        editable
        onEdit={async () => {
          const newDate = await editProp({
            data: date,
            inputType: "date",
            modalType: "modal",
            initiallyOpen: true,
            showFooter: false,
          });
          if (newDate) {
            setDate(new Date(newDate as string));
          }
        }}
      />
      <View>
        <Text>Picker inside drawer:</Text>
        <Text>{JSON.stringify(options)}</Text>
        <Picker
          label="Picker"
          showCreateOptionButton
          options={options}
          onFinish={(values) => {
            setOptions(values);
          }}
        />
      </View>
    </View>
  );
};

interface LongScrollContentProps {
  footerHeight?: number;
}

const LongScrollContent = ({ footerHeight }: LongScrollContentProps) => {
  const { theme } = useThemePreferences();
  const items = Array.from({ length: 50 }, (_, i) => i + 1);

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
          <Text>Footer height: {footerHeight}</Text>
        </View>
      ))}
    </View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

export const BottomSheetScreen = () => {
  const styles = useMemo(() => getStyles(), []);
  const { theme } = useThemePreferences();
  const fullTheme = useTheme();
  const insets = useSafeAreaInsets();

  const { openDrawer, editProp, openModal } = useModal();

  // ── Section 3: Re-render tracking ──
  const [viewType, setViewType] = useState<"view" | "scroll">("view");
  const [parentRenderCount, setParentRenderCount] = useState(0);
  const [parentInput, setParentInput] = useState("");
  const parentRenderRef = useRef(0);

  useEffect(() => {
    parentRenderRef.current += 1;
  });

  useEffect(() => {
    setParentRenderCount(parentRenderRef.current);
  }, [parentInput, viewType]);

  // ── Section 4: Keyboard config ──
  const keyboardSheetRef = useRef<BottomSheetModal>(null);
  const [keyboardInput, setKeyboardInput] = useState("Test input");
  const [activeKeyboardConfig, setActiveKeyboardConfig] =
    useState<KeyboardConfigType>(KEYBOARD_CONFIGS[0]);

  const handleOpenKeyboardSheet = useCallback((config: KeyboardConfigType) => {
    setActiveKeyboardConfig(config);
    keyboardSheetRef.current?.present();
  }, []);

  const handleCloseKeyboardSheet = useCallback(() => {
    keyboardSheetRef.current?.close();
  }, []);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* ── Section 1: useModal Hook ── */}
        <Text style={styles.sectionTitle}>1. useModal Hook — Core API</Text>
        <Text style={styles.sectionDescription}>
          Demonstrates the main openDrawer / editProp / openModal API.
        </Text>

        <Button
          mode="outlined"
          onPress={() =>
            openDrawer({
              title: "Simple Drawer",
              render: () => (
                <View style={{ padding: 16 }}>
                  <Text>This is a simple drawer with title and body text.</Text>
                </View>
              ),
            })
          }
          style={{ marginBottom: 8 }}
        >
          openDrawer() — simple
        </Button>

        <Button
          mode="outlined"
          onPress={() =>
            openDrawer({
              title: "Long Scrolling Content",
              containerType: "scrollview",
              bottomSheetProps: { enableDynamicSizing: true },
              render: ({ state }) => (
                <LongScrollContent footerHeight={state.footerHeight} />
              ),
            })
          }
          style={{ marginBottom: 8 }}
        >
          openDrawer() — containerType: scrollview
        </Button>

        <Button
          mode="outlined"
          onPress={() =>
            openDrawer({
              title: "With Confirm/Cancel Footer",
              footerType: "confirm_cancel",
              render: () => (
                <View style={{ padding: 16 }}>
                  <Text>This drawer has a built-in confirm/cancel footer.</Text>
                </View>
              ),
            })
          }
          style={{ marginBottom: 8 }}
        >
          openDrawer() — footerType: confirm_cancel
        </Button>

        <Button
          mode="outlined"
          onPress={() =>
            openDrawer({
              title: "Custom Footer",
              render: () => (
                <View style={{ padding: 16 }}>
                  <Text>Drawer with a custom renderFooter.</Text>
                </View>
              ),
              renderFooter: ({ state }) => (
                <View style={{ backgroundColor: "green", padding: 20 }}>
                  <Text style={{ color: "white" }}>Custom Footer</Text>
                  <Text style={{ color: "white" }}>
                    footerHeight: {state.footerHeight}
                  </Text>
                </View>
              ),
            })
          }
          style={{ marginBottom: 8 }}
        >
          openDrawer() — custom renderFooter
        </Button>

        <Button
          mode="outlined"
          onPress={() =>
            openDrawer({
              title: "Custom Handler",
              render: () => (
                <View style={{ padding: 16 }}>
                  <Text>Drawer with a custom renderHandler.</Text>
                </View>
              ),
              renderHandler: () => (
                <View
                  style={{
                    alignItems: "center",
                    paddingVertical: 8,
                    backgroundColor: fullTheme.colors.primaryContainer,
                  }}
                >
                  <View
                    style={{
                      width: 60,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: fullTheme.colors.primary,
                    }}
                  />
                  <Text style={{ marginTop: 4, color: fullTheme.colors.primary }}>
                    Custom handler
                  </Text>
                </View>
              ),
            })
          }
          style={{ marginBottom: 8 }}
        >
          openDrawer() — custom renderHandler
        </Button>

        <Button
          mode="outlined"
          onPress={() =>
            editProp({
              data: "Hello World",
              inputType: "text",
              modalType: "drawer",
              autoFocus: true,
              modalProps: { closeOnOutsideTouch: true, showBackdrop: true },
            })
          }
          style={{ marginBottom: 8 }}
        >
          editProp() — string (drawer)
        </Button>

        <Button
          mode="outlined"
          onPress={async () => {
            const result = await editProp({
              data: { key: "value", count: 42 },
              inputType: "text",
              modalType: "drawer",
              autoFocus: true,
            });
            console.log("editProp object result:", result);
          }}
          style={{ marginBottom: 8 }}
        >
          editProp() — object
        </Button>

        <Button
          mode="outlined"
          onPress={() =>
            openModal({
              render: ({ resolve, reject }) => (
                <View style={{ padding: 24 }}>
                  <Text variant="titleMedium" style={{ marginBottom: 12 }}>
                    Basic Modal
                  </Text>
                  <Text style={{ marginBottom: 24 }}>
                    This is a basic openModal() call.
                  </Text>
                  <Button
                    mode="contained"
                    onPress={() => resolve({ confirmed: true })}
                    style={{ marginBottom: 8 }}
                  >
                    Confirm
                  </Button>
                  <Button
                    mode="outlined"
                    onPress={() => reject(new Error("Cancelled"))}
                  >
                    Cancel
                  </Button>
                </View>
              ),
            })
          }
          style={{ marginBottom: 8 }}
        >
          openModal() — basic modal
        </Button>

        <View style={styles.divider} />

        {/* ── Section 2: Nested Drawers ── */}
        <Text style={styles.sectionTitle}>2. Nested Drawers</Text>
        <Text style={styles.sectionDescription}>
          Open a drawer and from within it open a second drawer. Demonstrates
          stack behavior and return value propagation.
        </Text>

        <Button
          mode="outlined"
          onPress={async () => {
            const result = await openModal({
              render: ({ resolve, reject }) => (
                <View style={{ padding: 24 }}>
                  <Text variant="titleMedium" style={{ marginBottom: 12 }}>
                    Outer Modal
                  </Text>
                  <Text style={{ marginBottom: 16 }}>
                    This is the outer modal. Open a nested drawer from here.
                  </Text>
                  <Button
                    mode="outlined"
                    onPress={() =>
                      openDrawer({
                        title: "Nested Drawer",
                        render: () => (
                          <View style={{ padding: 16 }}>
                            <Text>This is a nested drawer inside the modal.</Text>
                            <Button
                              onPress={() =>
                                openModal({
                                  render: ({ resolve: innerResolve }) => (
                                    <View style={{ padding: 24 }}>
                                      <Text>Inner modal (3rd level)</Text>
                                      <Button
                                        onPress={() =>
                                          innerResolve({ level: 3 })
                                        }
                                      >
                                        Close Inner Modal
                                      </Button>
                                    </View>
                                  ),
                                })
                              }
                              style={{ marginTop: 8 }}
                            >
                              Open Inner Modal
                            </Button>
                          </View>
                        ),
                      })
                    }
                    style={{ marginBottom: 16 }}
                  >
                    Open Nested Drawer
                  </Button>
                  <Button
                    mode="contained"
                    onPress={() => resolve({ confirmed: true })}
                    style={{ marginBottom: 8 }}
                  >
                    Confirm
                  </Button>
                  <Button
                    mode="outlined"
                    onPress={() => reject(new Error("Cancelled"))}
                  >
                    Cancel
                  </Button>
                </View>
              ),
            });
            console.log("Nested drawer result:", result);
          }}
          style={{ marginBottom: 8 }}
        >
          Open modal → nested drawer → inner modal
        </Button>

        <Button
          mode="outlined"
          onPress={async () => {
            const result = await openDrawer({
              title: "First Drawer",
              footerType: "confirm_cancel",
              render: ({ onChange }) => (
                <View style={{ padding: 16 }}>
                  <Text style={{ marginBottom: 12 }}>
                    First drawer. Open a second drawer and the value it returns
                    will be propagated back here.
                  </Text>
                  <Button
                    mode="outlined"
                    onPress={async () => {
                      const inner = await openDrawer({
                        title: "Second Drawer",
                        footerType: "confirm_cancel",
                        initialData: { value: "from second drawer" },
                        render: ({ state, onChange: innerChange }) => (
                          <View style={{ padding: 16 }}>
                            <Text>Second drawer data: {JSON.stringify(state.data)}</Text>
                            <Button
                              onPress={() =>
                                innerChange({ value: "updated in second drawer" })
                              }
                              style={{ marginTop: 8 }}
                            >
                              Update Value
                            </Button>
                          </View>
                        ),
                      });
                      if (inner) {
                        onChange(inner);
                      }
                    }}
                  >
                    Open Second Drawer
                  </Button>
                </View>
              ),
            });
            console.log("Nested drawers result:", result);
          }}
          style={{ marginBottom: 8 }}
        >
          Stacked drawers with value propagation
        </Button>

        <View style={styles.divider} />

        {/* ── Section 3: Re-render / State Tracking ── */}
        <Text style={styles.sectionTitle}>3. Re-render / State Tracking</Text>
        <Text style={styles.sectionDescription}>
          Parent render counter should NOT increment when interacting inside a
          drawer. EditableInfoCard onChange updates state correctly.
        </Text>

        <View style={styles.stateBox}>
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
          style={{ marginBottom: 8 }}
        >
          Toggle container type: {viewType}
        </Button>

        <Button
          mode="contained"
          onPress={() => {
            openDrawer({
              footerType: "confirm_cancel",
              containerType: viewType === "view" ? "view" : "scrollview",
              render: ({ onChange, state, resolve }) => (
                <InnerComponent
                  onChange={onChange}
                  footerHeight={state.footerHeight}
                  parentRenderCount={parentRenderCount}
                  resolve={resolve}
                />
              ),
              renderFooter: ({ state }) => (
                <View style={{ backgroundColor: "green", padding: 20 }}>
                  <Text style={{ color: "white" }}>FOOTER</Text>
                  <Text style={{ color: "white" }}>
                    footerHeight: {state.footerHeight}
                  </Text>
                  <Text style={{ color: "white" }}>
                    data: {JSON.stringify(state.data)}
                  </Text>
                </View>
              ),
            });
          }}
          style={{ marginBottom: 8 }}
        >
          Open Drawer (check render count)
        </Button>

        <Button
          mode="outlined"
          onPress={async () => {
            const recording = {
              title: "jfk.wav",
              description: "Test recording description",
              duration: 120,
              createdAt: new Date().toISOString(),
            };

            const result = await openDrawer({
              initialData: recording,
              title: "Edit Recording",
              footerType: "confirm_cancel",
              render: ({ state, onChange }) => (
                <View style={{ padding: 16 }}>
                  <Text variant="titleMedium" style={{ marginBottom: 16 }}>
                    Edit Recording Details
                  </Text>
                  <EditableInfoCard
                    label="Title"
                    value={state.data.title}
                    containerStyle={{
                      backgroundColor: theme.colors.surface,
                      marginBottom: 12,
                    }}
                    editable
                    inlineEditable
                    onInlineEdit={async (newValue) => {
                      onChange({ ...state.data, title: String(newValue || "") });
                    }}
                  />
                  <EditableInfoCard
                    label="Description"
                    value={state.data.description}
                    containerStyle={{
                      backgroundColor: theme.colors.surface,
                      marginBottom: 12,
                    }}
                    editable
                    inlineEditable
                    multiline
                    numberOfLines={3}
                    onInlineEdit={async (newValue) => {
                      onChange({
                        ...state.data,
                        description: String(newValue || ""),
                      });
                    }}
                  />
                  <EditableInfoCard
                    label="Duration"
                    value={`${state.data.duration} seconds`}
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
                      marginTop: 8,
                    }}
                  >
                    <Text variant="bodySmall">
                      Current: {JSON.stringify(state.data)}
                    </Text>
                  </View>
                </View>
              ),
            });
            console.log("Recording edit result:", result);
          }}
          style={{ marginBottom: 8 }}
        >
          EditableInfoCard inside drawer
        </Button>

        <View style={styles.divider} />

        {/* ── Section 4: Keyboard Behavior Configs ── */}
        <Text style={styles.sectionTitle}>4. Keyboard Behavior Configs</Text>
        <Text style={styles.sectionDescription}>
          Each config opens a direct BottomSheetModal with BottomSheetTextInput.
          Useful for testing keyboard handling on Android.
        </Text>

        {KEYBOARD_CONFIGS.map((config, index) => (
          <Button
            key={index}
            mode="outlined"
            style={{
              marginBottom: 8,
              backgroundColor: fullTheme.colors.secondaryContainer,
            }}
            onPress={() => handleOpenKeyboardSheet(config)}
          >
            {config.label}
          </Button>
        ))}
      </ScrollView>

      {/* ── Keyboard Test Bottom Sheet ── */}
      <BottomSheetModal
        ref={keyboardSheetRef}
        index={activeKeyboardConfig.index ?? 0}
        snapPoints={activeKeyboardConfig.snapPoints}
        enableDynamicSizing={activeKeyboardConfig.enableDynamicSizing}
        keyboardBehavior={activeKeyboardConfig.keyboardBehavior}
        keyboardBlurBehavior={activeKeyboardConfig.keyboardBlurBehavior}
        android_keyboardInputMode={
          activeKeyboardConfig.android_keyboardInputMode
        }
        enablePanDownToClose
        handleIndicatorStyle={{ width: 60, height: 6 }}
        backgroundStyle={{ backgroundColor: fullTheme.colors.surface }}
        topInset={insets.top}
        bottomInset={insets.bottom}
      >
        <BottomSheetView
          style={[
            styles.bottomSheetContent,
            { paddingBottom: Math.max(16, insets.bottom + 8) },
          ]}
        >
          <Text style={{ fontSize: 16, fontWeight: "bold", marginBottom: 8 }}>
            {activeKeyboardConfig.label}
          </Text>
          <Text style={{ marginBottom: 4 }}>
            keyboardBehavior: {activeKeyboardConfig.keyboardBehavior ?? "—"}
          </Text>
          <Text style={{ marginBottom: 4 }}>
            android_keyboardInputMode:{" "}
            {activeKeyboardConfig.android_keyboardInputMode ?? "—"}
          </Text>
          <Text style={{ marginBottom: 4 }}>
            enableDynamicSizing:{" "}
            {activeKeyboardConfig.enableDynamicSizing ? "true" : "false"}
          </Text>
          <Text style={{ marginBottom: 16 }}>
            snapPoints: {JSON.stringify(activeKeyboardConfig.snapPoints)}
          </Text>

          <BottomSheetTextInput
            placeholder="Test Input"
            value={keyboardInput}
            onChangeText={setKeyboardInput}
            style={{
              marginBottom: 16,
              padding: 10,
              borderWidth: 1,
              borderColor: fullTheme.colors.outline,
              borderRadius: 8,
              backgroundColor: fullTheme.colors.surface,
            }}
          />

          <BottomSheetTextInput
            placeholder="Another Input"
            value={keyboardInput}
            onChangeText={setKeyboardInput}
            style={{
              marginBottom: 16,
              padding: 10,
              borderWidth: 1,
              borderColor: fullTheme.colors.outline,
              borderRadius: 8,
              backgroundColor: fullTheme.colors.surface,
            }}
          />

          <View
            style={[
              styles.directBtn,
              { backgroundColor: fullTheme.colors.error },
            ]}
          >
            <Text
              style={styles.directBtnText}
              onPress={handleCloseKeyboardSheet}
            >
              Close
            </Text>
          </View>
        </BottomSheetView>
      </BottomSheetModal>
    </View>
  );
};

export default BottomSheetScreen;
