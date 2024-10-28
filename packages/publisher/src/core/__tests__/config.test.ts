import fs from 'fs';
import path from 'path';
import { loadConfig } from '../config';

jest.mock('fs');
jest.mock('path');

describe('Config Loading', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should load default config when no config file exists', async () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    
    const config = await loadConfig();
    
    expect(config).toMatchObject({
      packageManager: 'yarn',
      changelogFile: 'CHANGELOG.md',
      conventionalCommits: true
    });
  });

  it('should load and validate custom config', async () => {
    const mockConfig = {
      packageManager: 'yarn',
      changelogFile: 'CHANGES.md',
      git: {
        tagPrefix: 'v',
        requireCleanWorkingDirectory: false
      }
    };

    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (path.join as jest.Mock).mockReturnValue('/fake/path/publisher.config.js');
    jest.mock('/fake/path/publisher.config.js', () => mockConfig, { virtual: true });

    const config = await loadConfig();
    
    expect(config).toMatchObject(mockConfig);
  });
  
});
