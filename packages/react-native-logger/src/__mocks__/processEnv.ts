export const mockProcessEnv = (key: string, value: string) => {
  process.env[key] = value;
};
