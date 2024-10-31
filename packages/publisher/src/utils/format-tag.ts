export interface FormatTagOptions {
  packageName: string;
  version: string;
  tagPrefix: string;
}

export const formatGitTag = ({
  packageName,
  version,
  tagPrefix,
}: FormatTagOptions): string => `${tagPrefix}${packageName}@${version}`;
