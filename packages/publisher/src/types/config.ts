// packages/publisher/src/types/config.ts
import { z } from "zod";

export type PackageManager = "yarn" | "npm" | "pnpm";

// Git configuration schema
export const GitConfigSchema = z.object({
  tagPrefix: z.string().default("v"),
  requireCleanWorkingDirectory: z.boolean().default(true),
  requireUpToDate: z.boolean().default(true),
  commit: z.boolean().default(true),
  push: z.boolean().default(true),
  commitMessage: z
    .string()
    .default("chore(release): release ${packageName}@${version}"),
  tag: z.boolean().default(true),
  tagMessage: z.string().optional(),
  allowedBranches: z.array(z.string()).default(["main", "master"]),
  remote: z.string().default("origin"),
});

// NPM configuration schema
export const NpmConfigSchema = z.object({
  publish: z.boolean().default(true),
  registry: z.string().default("https://registry.npmjs.org"),
  tag: z.string().default("latest"),
  access: z.enum(["public", "restricted"]).default("public"),
  otp: z.string().optional(),
});

// Hooks configuration schema
export const HooksSchema = z.object({
  preRelease: z.function().optional(),
  postRelease: z.function().optional(),
  preVersionBump: z.function().optional(),
  postVersionBump: z.function().optional(),
  preChangelog: z.function().optional(),
  postChangelog: z.function().optional(),
  prePublish: z.function().optional(),
  postPublish: z.function().optional(),
});

// Package configuration schema
export const PackageConfigSchema = z.object({
  packageManager: z.enum(["npm", "yarn", "pnpm"]).default("yarn"),
  changelogFile: z.string().default("CHANGELOG.md"),
  conventionalCommits: z.boolean().default(true),
  changelogFormat: z
    .enum(["conventional", "keep-a-changelog"])
    .default("conventional"),
  versionStrategy: z.enum(["independent", "fixed"]).default("independent"),
  bumpStrategy: z.enum(["conventional", "prompt", "auto"]).default("prompt"),
  bumpType: z
    .enum([
      "patch",
      "minor",
      "major",
      "prepatch",
      "preminor",
      "premajor",
      "prerelease",
    ])
    .optional(),
  preReleaseId: z.string().optional(),
  git: GitConfigSchema,
  npm: NpmConfigSchema,
  hooks: HooksSchema,
});

// Release configuration schema (extends package config)
export const ReleaseConfigSchema = PackageConfigSchema;

// Monorepo configuration schema (extends package config)
export const MonorepoConfigSchema = PackageConfigSchema.extend({
  packages: z.record(z.string(), ReleaseConfigSchema.partial()).default({}),
  ignorePackages: z.array(z.string()).default([]),
  maxConcurrency: z.number().default(4),
});

// Infer types from schemas
export type GitConfig = z.infer<typeof GitConfigSchema>;
export type NpmConfig = z.infer<typeof NpmConfigSchema>;
export type Hooks = z.infer<typeof HooksSchema>;
export type PackageConfig = z.infer<typeof PackageConfigSchema>;
export type ReleaseConfig = z.infer<typeof ReleaseConfigSchema>;
export type MonorepoConfig = z.infer<typeof MonorepoConfigSchema>;

// Version bump types
export type BumpType =
  | "patch"
  | "minor"
  | "major"
  | "prepatch"
  | "preminor"
  | "premajor"
  | "prerelease"
  | "custom";

// Package release context
export interface PackageContext {
  name: string;
  path: string;
  currentVersion: string;
  newVersion?: string;
  changelog?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
}

export interface PackageJson {
  name?: string;
  version?: string;
  description?: string;
  main?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  bundledDependencies?: string[];
  engines?: Record<string, string>;
  repository?: {
    type: string;
    url: string;
  };
  author?: string | { name: string; email?: string; url?: string };
  license?: string;
  bugs?: { url: string; email?: string };
  homepage?: string;

  // Workspaces: allows for both an array of strings or an object with `packages`
  workspaces?: string[] | { packages: string[] };
}

// Release result
export interface ReleaseResult {
  packageName: string;
  version: string;
  changelog: string;
  git: {
    tag: string;
    commit: string;
  };
  npm?: {
    published: boolean;
    registry: string;
  };
}
