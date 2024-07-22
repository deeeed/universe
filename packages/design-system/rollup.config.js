import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import { terser } from 'rollup-plugin-terser';
import external from 'rollup-plugin-peer-deps-external';
import json from '@rollup/plugin-json';
import image from '@rollup/plugin-image';
import packageJson from './package.json';

/**
 * @type {import('rollup').RollupOptions}
 */
const config = [
  {
    external: [],
    input: 'src/index.ts',
    output: [
      {
        file: packageJson.module,
        inlineDynamicImports: false,
        format: 'esm',
        sourcemap: true,
        // sourcemapPathTransform: (relativeSourcePath, sourcemapPath) => {
        //   // Not sure why rollup otherwise adds an extra '../' to the path
        //   console.log(
        //     `relativeSourcePath: ${relativeSourcePath} --> sourceMapPath: ${sourcemapPath}`,
        //   );
        //   // Adjust the path transformation logic as needed
        //   return relativeSourcePath.replace(/^..\//, '');
        // },
      },
    ],
    plugins: [
      external(),
      image(),
      nodeResolve({
        browser: true,
      }),
      commonjs({}),
      typescript({ tsconfig: './tsconfig.build.json', allowJs: true }),
      json(),
      terser(),
    ],
  },
];

export default config;
