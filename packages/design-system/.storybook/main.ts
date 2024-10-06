import path, { join, dirname } from 'path';
import type { StorybookConfig } from '@storybook/react-webpack5';
import { Configuration, RuleSetRule } from 'webpack';

/**
 * This function is used to resolve the absolute path of a package.
 * It is needed in projects that use Yarn PnP or are set up within a monorepo.
 */
function getAbsolutePath(value) {
  return dirname(require.resolve(join(value, 'package.json')));
}

const production = process.env.NODE_ENV === 'production';

/** @type { import('@storybook/react-webpack5').StorybookConfig } */
const config: StorybookConfig = {
  stories: [
    '../src/pages/Introduction.mdx',
    '../src/pages/Installation.mdx',
    '../src/pages/Providers.mdx',
    '../src/**/*.mdx',
    '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)',
  ],

  staticDirs: ['../assets/'],

  managerHead: (head) => `
  ${head}
  ${production ? '<base href="/universe/design-system-storybook/" />' : ''}
  `,

  addons: [
    getAbsolutePath('@storybook/addon-webpack5-compiler-swc'),
    getAbsolutePath('@storybook/addon-onboarding'),
    getAbsolutePath('@storybook/addon-links'),
    getAbsolutePath('@storybook/addon-essentials'),
    getAbsolutePath('@chromatic-com/storybook'),
    getAbsolutePath('@storybook/addon-interactions'),
    {
      name: '@storybook/addon-react-native-web',
      options: {
        modulesToTranspile: ['react-native-reanimated', '@gorhom/bottom-sheet'],
        babelPlugins: [
          '@babel/plugin-proposal-export-namespace-from',
          'react-native-reanimated/plugin',
        ],
      },
    },
    getAbsolutePath('@storybook/addon-mdx-gfm'),
  ],

  framework: {
    name: getAbsolutePath('@storybook/react-webpack5'),
    options: {},
  },

  docs: {},

  webpackFinal: (config: Configuration) => {
    if (!config.resolve) config.resolve = {};
    config.resolve.alias = {
      ...config.resolve.alias,
      // 'buffer': require.resolve('buffer-browserify'),
      'react-native': path.resolve(
        __dirname,
        '../node_modules/react-native-web'
      ),
      '@siteed/design-system': path.resolve(__dirname, '../src'),
    };

    config.resolve.fallback = {
      ...config.resolve.fallback,
      tty: require.resolve('tty-browserify'),
      os: require.resolve('os-browserify/browser'),
    };

    // Ensure config.module and config.module.rules are defined
    config.module = config.module || { rules: [] };

    // Find and modify the rule that handles SVG files
    const fileLoaderRule = config.module.rules?.find(
      (rule): rule is RuleSetRule => {
        if (rule && typeof rule === 'object' && 'test' in rule) {
          const testRegex = rule.test as RegExp;
          const match = testRegex.test('.svg');
          if (match) {
            console.log('match', rule);
          }
          return match;
        }
        return false;
      }
    );

    if (fileLoaderRule) {
      // Exclude SVGs from the existing rule
      fileLoaderRule.exclude = /\.svg$/;
    }

    // Add a new rule for handling SVGs with SVGR
    config.module.rules?.push({
      test: /\.svg$/,
      use: ['@svgr/webpack'],
    });

    return config;
  },

  typescript: {
    reactDocgen: 'react-docgen-typescript',
  },
};

// Add Jest configuration separately
if (config.framework && typeof config.framework === 'object') {
  config.framework.options = {
    ...config.framework.options,
    jest: {
      configure: (jestConfig) => {
        jestConfig.transformIgnorePatterns = [
          'node_modules/(?!(@storybook/.*|react-native|react-native-reanimated)/)',
        ];
        return jestConfig;
      },
    },
  };
}

export default config;
