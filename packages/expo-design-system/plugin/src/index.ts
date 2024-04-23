import { ConfigPlugin } from "@expo/config-plugins";

const withDependencies: ConfigPlugin<object> = (config, existingPerms) => {
  if (!existingPerms) {
    console.warn("No previous permissions provided");
  }
  //TODO: add all mandatory dependencies
  return config;
};

export default withDependencies;
