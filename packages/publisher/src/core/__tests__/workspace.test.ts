import globby from 'globby';
import { readFile } from 'node:fs/promises';
import path from 'path';
import { PackageJson } from '../../types/config';
import { WorkspaceService } from '../workspace';

// Mock modules
jest.mock('globby', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('node:fs/promises', () => ({
  readFile: jest.fn(),
}));


describe('WorkspaceService', () => {
  let workspaceService: WorkspaceService;

  beforeEach(() => {
    workspaceService = new WorkspaceService();
    jest.clearAllMocks();
  });

  describe('getPackages', () => {
    it('should detect workspace packages correctly', async () => {
      const mockPackages = ['packages/pkg-a', 'packages/pkg-b'];

      const mockPackageJsons: Record<string, PackageJson> = {
        'packages/pkg-a': {
          name: '@scope/pkg-a',
          version: '1.0.0',
        },
        'packages/pkg-b': {
          name: '@scope/pkg-b',
          version: '2.0.0',
        },
        '': {
          workspaces: ['packages/*'],
        },
      };

      const globbyMock = globby as jest.MockedFunction<typeof globby>;
      globbyMock.mockResolvedValue(mockPackages);

      const readFileMock = readFile as jest.MockedFunction<typeof readFile>;
      readFileMock.mockImplementation((filePath) => {
        const relativePath = path.relative(process.cwd(), filePath as string).split(path.sep).join('/');
        const pkgPath =
          relativePath === 'package.json'
            ? ''
            : relativePath.replace(/\/?package\.json$/, '');
        const packageJson = mockPackageJsons[pkgPath];

        if (!packageJson) {
          throw new Error(`Mock package.json not found for path: ${pkgPath}`);
        }

        return Promise.resolve(JSON.stringify(packageJson));
      });

      const packages = await workspaceService.getPackages();

      expect(packages).toHaveLength(2);
      expect(packages[0].name).toBe('@scope/pkg-a');
      expect(packages[1].name).toBe('@scope/pkg-b');
    });

    it('should skip packages without a name', async () => {
      const mockPackages = ['packages/pkg-unnamed'];
      const mockPackageJsons: Record<string, PackageJson> = {
        'packages/pkg-unnamed': {
          version: '1.0.0',
        },
        '': {
          workspaces: ['packages/*'],
        },
      };

      const globbyMock = globby as jest.MockedFunction<typeof globby>;
      globbyMock.mockResolvedValue(mockPackages);

      const readFileMock = readFile as jest.MockedFunction<typeof readFile>;
      readFileMock.mockImplementation( (filePath) => {
        const relativePath = path.relative(process.cwd(), filePath as string).split(path.sep).join('/');
        const pkgPath =
          relativePath === 'package.json'
            ? ''
            : relativePath.replace(/\/?package\.json$/, '');
        const packageJson = mockPackageJsons[pkgPath];

        if (!packageJson) {
          throw new Error(`Mock package.json not found for path: ${pkgPath}`);
        }

        // Wrap the return value in Promise.resolve()
        return Promise.resolve(JSON.stringify(packageJson));
      });

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const packages = await workspaceService.getPackages();

      expect(packages).toHaveLength(0);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('has no name, skipping'),
      );

      consoleWarnSpy.mockRestore();
    });

    it('should handle workspaces defined as an object with packages array', async () => {
      const mockPackages = ['packages/pkg-a'];
      const mockPackageJsons: Record<string, PackageJson> = {
        'packages/pkg-a': {
          name: '@scope/pkg-a',
          version: '1.0.0',
        },
        '': {
          workspaces: {
            packages: ['packages/*'],
          },
        },
      };

      const globbyMock = globby as jest.MockedFunction<typeof globby>;
      globbyMock.mockResolvedValue(mockPackages);

      const readFileMock = readFile as jest.MockedFunction<typeof readFile>;
      readFileMock.mockImplementation((filePath) => {
        const relativePath = path.relative(process.cwd(), filePath as string).split(path.sep).join('/');
        const pkgPath =
          relativePath === 'package.json'
            ? ''
            : relativePath.replace(/\/?package\.json$/, '');
        const packageJson = mockPackageJsons[pkgPath];

        if (!packageJson) {
          throw new Error(`Mock package.json not found for path: ${pkgPath}`);
        }

        return Promise.resolve(JSON.stringify(packageJson));
      });

      const packages = await workspaceService.getPackages();

      expect(packages).toHaveLength(1);
      expect(packages[0].name).toBe('@scope/pkg-a');
    });

    it('should handle errors when reading package.json', async () => {
      const mockPackages = ['packages/pkg-error'];

      const globbyMock = globby as jest.MockedFunction<typeof globby>;
      globbyMock.mockResolvedValue(mockPackages);

      const readFileMock = readFile as jest.MockedFunction<typeof readFile>;
      readFileMock.mockImplementation(() => {
        throw new Error('File not found');
      });

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const packages = await workspaceService.getPackages();

      expect(packages).toHaveLength(0);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error processing package at'),
        expect.any(Error),
      );

      consoleErrorSpy.mockRestore();
    });

    it('should correctly parse dependencies', async () => {
      const mockPackages = ['packages/pkg-a'];
      const mockPackageJsons: Record<string, PackageJson> = {
        'packages/pkg-a': {
          name: '@scope/pkg-a',
          version: '1.0.0',
          dependencies: {
            lodash: '^4.17.21',
          },
          devDependencies: {
            jest: '^27.0.0',
          },
          peerDependencies: {
            react: '^17.0.0',
          },
        },
        '': {
          workspaces: ['packages/*'],
        },
      };

      const globbyMock = globby as jest.MockedFunction<typeof globby>;
      globbyMock.mockResolvedValue(mockPackages);

      const readFileMock = readFile as jest.MockedFunction<typeof readFile>;
      readFileMock.mockImplementation((filePath) => {
        const relativePath = path.relative(process.cwd(), filePath as string).split(path.sep).join('/');
        const pkgPath =
          relativePath === 'package.json'
            ? ''
            : relativePath.replace(/\/?package\.json$/, '');
        const packageJson = mockPackageJsons[pkgPath];

        if (!packageJson) {
          throw new Error(`Mock package.json not found for path: ${pkgPath}`);
        }

        return Promise.resolve(JSON.stringify(packageJson));
      });

      const packages = await workspaceService.getPackages();

      expect(packages).toHaveLength(1);
      const pkg = packages[0];
      expect(pkg.dependencies).toEqual({ lodash: '^4.17.21' });
      expect(pkg.devDependencies).toEqual({ jest: '^27.0.0' });
      expect(pkg.peerDependencies).toEqual({ react: '^17.0.0' });
    });
  });

  describe('getPackageConfig', () => {
    it('should return package-specific config when it exists', async () => {
      const packageName = '@scope/pkg-a';
      workspaceService['packageCache'].set(packageName, {
        name: packageName,
        path: 'packages/pkg-a',
        currentVersion: '1.0.0',
        dependencies: {},
        devDependencies: {},
        peerDependencies: {},
      });

      jest.mock(
        path.join(process.cwd(), 'packages/pkg-a', 'publisher.config.ts'),
        () => ({
          __esModule: true,
          default: { packageManager: 'npm' },
        }),
        { virtual: true },
      );

      const config = await workspaceService.getPackageConfig(packageName);

      expect(config).toBeDefined();
      expect(config.packageManager).toBe('npm');
    });

    it('should return default config when package-specific config does not exist', async () => {
      const packageName = '@scope/pkg-a';
      workspaceService['packageCache'].set(packageName, {
        name: packageName,
        path: 'packages/pkg-a',
        currentVersion: '1.0.0',
        dependencies: {},
        devDependencies: {},
        peerDependencies: {},
      });

      const config = await workspaceService.getPackageConfig(packageName);

      expect(config).toBeDefined();
      expect(config.packageManager).toBe('npm'); // Default value
    });
  });
});
