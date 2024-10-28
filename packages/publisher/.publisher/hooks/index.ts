import type { PackageContext } from '@siteed/publisher';
import { exec } from '@siteed/publisher/utils';

export async function preRelease(context: PackageContext): Promise<void> {
  // Run tests
  await exec('yarn test', { cwd: context.path });
  
  // Run type checking
  await exec('yarn typecheck', { cwd: context.path });
  
  // Build the package
  await exec('yarn build', { cwd: context.path });
}

export async function postRelease(context: PackageContext): Promise<void> {
  // Clean up build artifacts
  await exec('yarn clean', { cwd: context.path });
  
  // Run any post-release notifications or integrations
  console.log(`Successfully released ${context.name}@${context.newVersion}`);
}
