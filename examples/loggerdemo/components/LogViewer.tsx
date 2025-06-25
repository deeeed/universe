import { Picker } from "@react-native-picker/picker";
import {
  clearLogs,
  getLogger,
  getLogs,
  setLoggerConfig,
} from "@siteed/react-native-logger";
import React, { useEffect, useState } from "react";
import {
  FlatList,
  ListRenderItemInfo,
  LogBox,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { NamespaceManager } from "./NamespaceManager";
import { InstanceIsolationDemo } from "./InstanceIsolationDemo";
import { LazyInitializationDemo } from "./LazyInitializationDemo";
import { ColorizationDemo } from "./ColorizationDemo";
import { StyledButton } from "./StyledButton";
import { theme } from "../styles/theme";

export interface LogViewerProps {}

LogBox.ignoreAllLogs(); // Ignore all log notifications

const logger = getLogger("LogViewer");

export const LogViewer = (_: LogViewerProps) => {
  const [logs, setLogs] = useState(getLogs());
  const [logLevel, setLogLevel] = useState<
    "all" | "debug" | "info" | "warn" | "error"
  >("all");
  const [namespaces, setNamespaces] = useState<string[]>(["LogViewer"]);
  const [isCustomMaxLogs, setIsCustomMaxLogs] = useState<boolean>(false);
  const [maxLogs, setMaxLogs] = useState<number>(1000);
  const [activeTab, setActiveTab] = useState<"main" | "isolation" | "lazy" | "color">("main");

  const styles = getStyles();

  const handleRefresh = () => {
    setLogs(getLogs());
  };

  const handleClear = () => {
    clearLogs();
    handleRefresh();
  };

  const filteredLogs = logs.filter(
    (log) =>
      logLevel === "all" ||
      log.message.startsWith(`[${logLevel.toUpperCase()}]`),
  );

  const handleAddNamespace = (namespace: string) => {
    setNamespaces((prev) => {
      const newNamespaces = [...prev, namespace];
      setLoggerConfig({ namespaces: newNamespaces.join(",") });
      return newNamespaces;
    });
  };

  const handleRemoveNamespace = (namespace: string) => {
    setNamespaces((prev) => {
      const newNamespaces = prev.filter((ns) => ns !== namespace);
      if (newNamespaces.length === 0) {
        setLoggerConfig({ namespaces: namespaces.join(",") });
      } else {
        setLoggerConfig({ namespaces: newNamespaces.join(",") });
      }
      return newNamespaces;
    });
  };

  useEffect(() => {
    handleRefresh();
    return () => {
      logger.info("LogViewer unmounted");
    };
  }, []);

  useEffect(() => {
    if(namespaces.length === 0) {
      return;
    }
    setLoggerConfig({ namespaces: namespaces.join(",") });
  }, [namespaces]);

  const getLogLevelColor = (message: string) => {
    if (message.includes('[ERROR]')) return theme.colors.danger;
    if (message.includes('[WARN]')) return theme.colors.warning;
    if (message.includes('[INFO]')) return theme.colors.info;
    if (message.includes('[DEBUG]')) return theme.colors.secondary;
    return theme.colors.text;
  };

  const renderItem = ({ item }: ListRenderItemInfo<typeof logs[0]>) => (
    <View style={styles.logEntry}>
      <View style={styles.logHeader}>
        <View style={styles.logMeta}>
          <Text style={styles.timestamp}>
            {new Date(item.timestamp).toLocaleTimeString()}
          </Text>
          <Text style={styles.context}>{item.namespace}</Text>
        </View>
        <View style={[styles.logLevelIndicator, { backgroundColor: getLogLevelColor(item.message) }]} />
      </View>
      <Text style={[styles.message, { color: getLogLevelColor(item.message) }]}>
        {item.message}
      </Text>
    </View>
  );

  const renderTab = (id: typeof activeTab, label: string) => (
    <TouchableOpacity
      style={[styles.tab, activeTab === id && styles.activeTab]}
      onPress={() => setActiveTab(id)}
    >
      <Text style={[styles.tabText, activeTab === id && styles.activeTabText]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.tabContainer}>
        {renderTab("main", "Main Demo")}
        {renderTab("isolation", "Instance Isolation")}
        {renderTab("lazy", "Lazy Init")}
        {renderTab("color", "Colorization")}
      </View>

      {activeTab === "main" ? (
        <>
          <FlatList
            data={filteredLogs}
            renderItem={renderItem}
            keyExtractor={(item, index) => `${index}-${item.timestamp}`}
            style={styles.viewer}
            initialNumToRender={20} // Adjust based on performance requirements
          />
          <View style={styles.buttonsContainer}>
            <StyledButton
              onPress={() => {
                logger.info("Add log button pressed", { aaa: "ok" });
                logger.debug("Add log button pressed", { aaa: "ok", bbb: "ok" });
                logger.warn("Add log button pressed", {
                  aaa: "ok",
                  bbb: "ok",
                  ccc: "ok",
                });
                logger.error(new Error("Add log button pressed"), {
                  aaa: "ok",
                  bbb: "ok",
                  ccc: "ok",
                  ddd: "ok",
                });
                handleRefresh();
              }}
              title="Add Log"
              variant="primary"
            />
            <StyledButton onPress={handleRefresh} title="Refresh" variant="secondary" />
            <StyledButton onPress={handleClear} title="Clear" variant="danger" />
          </View>
          <View style={styles.pickerContainer}>
            <Text style={styles.pickerLabel}>Filter by log level:</Text>
            <Picker
              selectedValue={logLevel}
              style={styles.picker}
              onValueChange={(itemValue) => setLogLevel(itemValue as any)}
            >
              <Picker.Item label="All" value="all" />
              <Picker.Item label="Debug" value="debug" />
              <Picker.Item label="Info" value="info" />
              <Picker.Item label="Warn" value="warn" />
              <Picker.Item label="Error" value="error" />
            </Picker>
          </View>
          <NamespaceManager
            namespaces={namespaces}
            onAddNamespace={handleAddNamespace}
            onRemoveNamespace={handleRemoveNamespace}
          />
          <View style={styles.maxLogsContainer}>
            <Text>Use custom max logs:</Text>
            <Switch value={isCustomMaxLogs} onValueChange={setIsCustomMaxLogs} />
            {isCustomMaxLogs && (
              <TextInput
                style={styles.maxLogsInput}
                value={String(maxLogs)}
                onChangeText={(text) => setMaxLogs(Number(text))}
                inputMode="numeric"
                placeholder="Enter max logs"
              />
            )}
          </View>
          <View style={styles.logCount}>
            <Text>Total Logs: {logs.length}</Text>
            <Text>Displayed Logs: {filteredLogs.length}</Text>
          </View>
        </>
      ) : (
        <ScrollView style={styles.demoContainer}>
          {activeTab === "isolation" && <InstanceIsolationDemo />}
          {activeTab === "lazy" && <LazyInitializationDemo />}
          {activeTab === "color" && <ColorizationDemo />}
        </ScrollView>
      )}
    </View>
  );
};

const getStyles = () =>
  StyleSheet.create({
    container: {
      flex: 1,
      width: "100%",
      backgroundColor: theme.colors.background,
    },
    tabContainer: {
      flexDirection: "row",
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      ...theme.shadows.sm,
    },
    tab: {
      flex: 1,
      paddingVertical: theme.spacing.md,
      alignItems: "center",
      borderBottomWidth: 3,
      borderBottomColor: "transparent",
    },
    activeTab: {
      borderBottomColor: theme.colors.primary,
    },
    tabText: {
      ...theme.typography.body,
      color: theme.colors.textSecondary,
    },
    activeTabText: {
      color: theme.colors.primary,
      fontWeight: "600",
    },
    demoContainer: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    viewer: {
      flex: 1,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      margin: theme.spacing.sm,
      ...theme.shadows.md,
    },
    controlsContainer: {
      flexShrink: 0,
    },
    buttonsContainer: {
      flexDirection: "row",
      justifyContent: "space-around",
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      margin: theme.spacing.sm,
      ...theme.shadows.sm,
    },
    pickerContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
      margin: theme.spacing.sm,
      ...theme.shadows.sm,
    },
    pickerLabel: {
      ...theme.typography.body,
      marginRight: theme.spacing.md,
      color: theme.colors.text,
    },
    picker: {
      height: 50,
      flex: 1,
    },
    maxLogsContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
      margin: theme.spacing.sm,
      gap: theme.spacing.sm,
      ...theme.shadows.sm,
    },
    maxLogsInput: {
      height: 40,
      borderColor: theme.colors.border,
      borderWidth: 1,
      borderRadius: theme.borderRadius.sm,
      flex: 1,
      marginLeft: theme.spacing.md,
      paddingHorizontal: theme.spacing.sm,
      backgroundColor: theme.colors.light,
    },
    logCount: {
      flexDirection: "row",
      justifyContent: "space-between",
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
      margin: theme.spacing.sm,
      ...theme.shadows.sm,
    },
    logEntry: {
      padding: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    logHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: theme.spacing.xs,
    },
    logMeta: {
      flex: 1,
    },
    logLevelIndicator: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginLeft: theme.spacing.sm,
    },
    context: { 
      ...theme.typography.caption,
      fontWeight: "600",
      color: theme.colors.primary,
      marginTop: 2,
    },
    message: { 
      ...theme.typography.body,
      lineHeight: 20,
    },
    timestamp: { 
      ...theme.typography.caption,
      color: theme.colors.textSecondary,
    },
  });
