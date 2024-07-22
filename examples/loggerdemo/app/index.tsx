import { Text, View } from "react-native";
import { LogViewer } from "../components/LogViewer";

export default function Index() {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <LogViewer />
    </View>
  );
}
