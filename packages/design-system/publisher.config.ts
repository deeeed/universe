import { ReleaseConfig } from '@siteed/publisher';
import { exec } from 'child_process';
import util from 'util';

const asyncExec = util.promisify(exec);

export default {
  git: {
    tagPrefix: 'design-system-v',
    requireCleanWorkingDirectory: false, // Since you allow uncommitted changes
    commitMessage: 'feat(design-system): bump version ${version}',
  },
  hooks: {
    async preRelease(context) {
      // Check for uncommitted changes
      const { stdout: status } = await asyncExec('git status --porcelain');
      if (status) {
        console.log('\n⚠️  Warning: You have uncommitted changes:');
        console.log(status);
        console.log('\nThese changes will be included in the release commit.');
        const continueWithChanges = await context.prompts.confirm(
          'Do you want to continue anyway?',
        );
        if (!continueWithChanges) {
          throw new Error('Please commit or stash your changes first.');
        }
        console.log('\nProceeding with uncommitted changes...');
      }

      // Run typecheck
      console.log('\nRunning typecheck...');
      await asyncExec('yarn typecheck');

      // Deploy Storybook
      console.log('\nDeploying Storybook...');
      await asyncExec('yarn deploy:storybook');
    },
    async postRelease() {
      console.log('\n✨ Release process completed successfully!');
      console.log('New version has been released:');
      console.log('- Git tag created and pushed');
      console.log('- Updated CHANGELOG.md');
      console.log('- Published to npm');
      console.log('- Storybook has been deployed');
      console.log('- All changes have been committed and pushed');
    },
  },
} satisfies ReleaseConfig;
