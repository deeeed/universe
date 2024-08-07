import { Picker } from "@react-native-picker/picker";
import {
  clearLogs,
  getLogger,
  getLogs,
  setLoggerConfig,
} from "@siteed/react-native-logger";
import React, { useEffect, useState } from "react";
import {
  Button,
  FlatList,
  ListRenderItemInfo,
  LogBox,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View
} from "react-native";
import { NamespaceManager } from "./NamespaceManager";

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

  const renderItem = ({ item }: ListRenderItemInfo<typeof logs[0]>) => (
    <View style={styles.logEntry}>
      <View>
        <Text style={styles.timestamp}>
          {new Date(item.timestamp).toLocaleTimeString()}
        </Text>
        <Text style={styles.context}>{item.namespace}</Text>
      </View>
      <Text style={styles.message}>{item.message}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
       <FlatList
        data={filteredLogs}
        renderItem={renderItem}
        keyExtractor={(item, index) => `${index}-${item.timestamp}`}
        style={styles.viewer}
        initialNumToRender={20} // Adjust based on performance requirements
      />
      <View style={styles.buttonsContainer}>
        <Button
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
          title="Add log"
        />
        <Button onPress={handleRefresh} title="Refresh" />
        <Button onPress={handleClear} title="Clear" />
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
    </View>
  );
};

const getStyles = () =>
  StyleSheet.create({
    container: {
      flex: 1,
      width: "100%",
      padding: 5,
    },
    viewer: {
      flex: 1,
      borderWidth: 1,
      marginBottom: 10,
    },
    controlsContainer: {
      flexShrink: 0,
    },
    buttonsContainer: {
      flexDirection: "row",
      justifyContent: "space-around",
      marginBottom: 10,
    },
    pickerContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 10,
      zIndex: 10,
    },
    pickerLabel: {
      marginRight: 10,
    },
    picker: {
      height: 50,
      flex: 1,
    },
    maxLogsContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 10,
      gap: 5,
    },
    maxLogsInput: {
      height: 40,
      borderColor: "gray",
      borderWidth: 1,
      flex: 1,
      marginLeft: 10,
      padding: 5,
    },
    logCount: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 10,
    },
    context: { fontSize: 10, fontWeight: "bold" },
    logEntry: {},
    message: { fontSize: 10 },
    timestamp: { color: "grey", fontSize: 10 },
  });
