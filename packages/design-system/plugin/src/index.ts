import { ConfigPlugin } from '@expo/config-plugins';

const withDependencies: ConfigPlugin<{ extras: unknown }> = (
  config,
  existingPerms
) => {
  console.log(
    `@siteed/design-system withDependencies from ${__dirname}`,
    existingPerms
  );

  return config;
};

export default withDependencies;
