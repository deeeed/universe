import React, { useState } from "react";
import {
  Button,
  StyleSheet,
  Text,
  TextInput,
  View,
  FlatList,
} from "react-native";

interface NamespaceManagerProps {
  namespaces: string[];
  onAddNamespace: (namespace: string) => void;
  onRemoveNamespace: (namespace: string) => void;
}

export const NamespaceManager: React.FC<NamespaceManagerProps> = ({
  namespaces,
  onAddNamespace,
  onRemoveNamespace,
}) => {
  const [namespace, setNamespace] = useState("");

  const handleAddNamespace = () => {
    if (namespace && !namespaces.includes(namespace)) {
      onAddNamespace(namespace);
      setNamespace("");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Namespaces:</Text>
      <FlatList
        data={namespaces}
        renderItem={({ item }) => (
          <View style={styles.namespaceItem}>
            <Text>{item}</Text>
            <Button title="Remove" onPress={() => onRemoveNamespace(item)} />
          </View>
        )}
        keyExtractor={(item) => item}
        style={styles.namespaceList}
      />
      <TextInput
        style={styles.input}
        value={namespace}
        onChangeText={setNamespace}
        placeholder="Add namespace"
      />
      <Button title="Add" onPress={handleAddNamespace} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: "bold",
  },
  namespaceItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 5,
  },
  namespaceList: {
    maxHeight: 100,
  },
  input: {
    borderColor: "gray",
    borderWidth: 1,
    padding: 5,
    marginVertical: 10,
  },
});
