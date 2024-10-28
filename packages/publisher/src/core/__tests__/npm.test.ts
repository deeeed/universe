import execa, { ExecaReturnValue } from 'execa';
import { mocked } from 'jest-mock';
import type { NpmConfig } from '../../types/config';
import { NpmService } from '../npm'; // Adjust the import path as necessary

jest.mock('execa');
const mockExeca = mocked(execa);

describe('NpmService', () => {
  const mockConfig: NpmConfig = {
    registry: 'https://registry.npmjs.org',
    tag: 'latest',
    access: 'public',
    publish: true
  };

  const service = new NpmService(mockConfig);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateAuth', () => {
    it('should validate authentication successfully', async () => {
      mockExeca.mockResolvedValueOnce({ stdout: Buffer.from('user') } as ExecaReturnValue<Buffer>);

      await expect(service.validateAuth()).resolves.not.toThrow();
      expect(mockExeca).toHaveBeenCalledWith('npm', ['whoami', '--registry', mockConfig.registry]);
    });

    it('should throw an error if not authenticated', async () => {
      mockExeca.mockResolvedValueOnce({ stdout: Buffer.from('') } as ExecaReturnValue<Buffer>);

      await expect(service.validateAuth()).rejects.toThrow('Not authenticated to npm registry');
    });
  });

  describe('getLatestVersion', () => {
    it('should return the latest version successfully', async () => {
      const mockResponse = Buffer.from('1.2.3');
      mockExeca.mockResolvedValueOnce({ stdout: mockResponse } as ExecaReturnValue<Buffer>);

      const version = await service.getLatestVersion('test-package');
      expect(version).toBe('1.2.3');
      expect(mockExeca).toHaveBeenCalledWith('npm', ['view', 'test-package', 'version', '--registry', mockConfig.registry]);
    });
  });
});
