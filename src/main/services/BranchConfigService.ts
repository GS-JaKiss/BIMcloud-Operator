import path from 'node:path';
import fs from 'node:fs/promises';
import type {
  BranchData,
  DiscoveredBranch,
  Overrides,
  SavePayload,
  SaveResult
} from '../../shared/contracts';
import { BranchFileRepository } from './BranchFileRepository';
import { WebUiConfigMapper } from './WebUiConfigMapper';

export const SOURCE_CONFIG_PATH = path.join(
  'Sources',
  'TWPortalServer',
  'TeamworkPortalServer',
  'js',
  'config',
  'config.json'
);

export const DEVELOPMENT_CONFIG_PATH = path.join(
  'Sources',
  'TWPortalServer',
  'TeamworkPortalServer',
  'js',
  'config',
  'developmentConfig.json'
);

export const TIMER_CONFIG_PATH = path.join(
  'Sources',
  'TWPortalServer',
  'TeamworkPortalServer',
  'js',
  'config',
  'timerConfig.json'
);

type SourceConfig = Record<string, unknown>;

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error;
}

export class BranchConfigService {
  public constructor(
    private readonly files = new BranchFileRepository(),
    private readonly mapper = new WebUiConfigMapper()
  ) {}

  public async discoverBranches(rootPath: string): Promise<DiscoveredBranch[]> {
    const normalizedRoot = path.resolve(rootPath);
    const searchRoot = path.dirname(normalizedRoot);
    const entries = await fs.readdir(searchRoot, { withFileTypes: true });
    const candidates = await Promise.all(entries
      .filter((entry) => entry.isDirectory())
      .map(async (entry): Promise<DiscoveredBranch | null> => {
        const candidatePath = path.join(searchRoot, entry.name);
        const markerPaths = ['Sources', 'Control'].map((marker) => path.join(candidatePath, marker));
        const markerResults = await Promise.all(markerPaths.map(async (markerPath) => {
          try {
            return (await fs.stat(markerPath)).isDirectory();
          } catch (error: unknown) {
            if (isNodeError(error) && error.code === 'ENOENT') return false;
            throw error;
          }
        }));

        return markerResults.every(Boolean)
          ? { name: entry.name, rootPath: candidatePath }
          : null;
      }));

    return candidates
      .filter((candidate): candidate is DiscoveredBranch => candidate !== null)
      .sort((left, right) => left.name.localeCompare(right.name));
  }

  public async loadBranch(rootPath: string): Promise<BranchData> {
    const normalizedRoot = path.resolve(rootPath);
    const markerPaths = ['Sources', 'Control'].map((marker) => path.join(normalizedRoot, marker));
    const markers = await Promise.all(markerPaths.map(async (markerPath) => {
      try {
        return (await fs.stat(markerPath)).isDirectory();
      } catch (error: unknown) {
        if (isNodeError(error) && error.code === 'ENOENT') return false;
        throw error;
      }
    }));
    if (!markers.every(Boolean)) {
      throw new Error('The selected folder is not a development branch. Expected Sources and Control folders.');
    }

    const sourcePath = path.join(normalizedRoot, SOURCE_CONFIG_PATH);
    const developmentSourcePath = path.join(normalizedRoot, DEVELOPMENT_CONFIG_PATH);
    const timerSourcePath = path.join(normalizedRoot, TIMER_CONFIG_PATH);
    const [sourceConfig, developmentConfig, timerConfig] = await Promise.all([
      this.readSourceConfig(sourcePath),
      this.readSourceConfig(developmentSourcePath, false),
      this.readSourceConfig(timerSourcePath, false)
    ]);
    const combinedSourceConfig = { ...sourceConfig, ...developmentConfig, ...timerConfig };

    const xmlFiles = await this.files.findTargetFiles(normalizedRoot);
    const options = this.mapper.flattenOptions(combinedSourceConfig);
    const xmlPath = xmlFiles[0] ?? null;
    if (!xmlPath) {
      return {
        rootPath: normalizedRoot,
        sourcePath,
        xmlPath: null,
        options,
        overrides: {}
      };
    }

    const xml = await this.files.readText(xmlPath);

    return {
      rootPath: normalizedRoot,
      sourcePath,
      xmlPath,
      options,
      overrides: this.mapper.readOverrides(xml, options)
    };
  }

  public async saveBranch({ rootPath, overrides }: SavePayload): Promise<SaveResult> {
    const branch = await this.loadBranch(rootPath);
    if (!branch.xmlPath) throw new Error('Build Portal before saving XML configuration.');
    const originalXml = await this.files.readText(branch.xmlPath);
    const updatedXml = this.mapper.applyOverrides(originalXml, branch.options, overrides);
    this.mapper.validateXml(updatedXml);
    const backupPath = await this.files.writeWithBackup(branch.xmlPath, updatedXml);

    return { backupPath, branch: await this.loadBranch(rootPath) };
  }

  public async exportConfig(filePath: string, { rootPath, overrides }: SavePayload): Promise<void> {
    const branch = await this.loadBranch(rootPath);
    if (!branch.xmlPath) throw new Error('Build Portal before exporting XML configuration.');
    const originalXml = await this.files.readText(branch.xmlPath);
    const updatedXml = this.mapper.applyOverrides(originalXml, branch.options, overrides);
    this.mapper.validateXml(updatedXml);
    await fs.writeFile(filePath, updatedXml, 'utf8');
  }

  public async importConfig(filePath: string, rootPath: string): Promise<Overrides> {
    const branch = await this.loadBranch(rootPath);
    const xml = await fs.readFile(filePath, 'utf8');
    this.mapper.validateXml(xml);
    return this.mapper.readOverrides(xml, branch.options);
  }

  public async deleteBinWin(rootPath: string): Promise<void> {
    const normalizedRoot = path.resolve(rootPath);
    if (normalizedRoot === path.parse(normalizedRoot).root) {
      throw new Error('A drive root cannot be used as a development branch.');
    }

    const markerPaths = ['Sources', 'Control'].map((marker) => path.join(normalizedRoot, marker));
    const markers = await Promise.all(markerPaths.map(async (markerPath) => {
      try {
        return (await fs.stat(markerPath)).isDirectory();
      } catch (error: unknown) {
        if (isNodeError(error) && error.code === 'ENOENT') return false;
        throw error;
      }
    }));
    if (!markers.every(Boolean)) throw new Error('The selected path is not a valid development branch.');

    const binWinPath = path.join(normalizedRoot, 'Bin.Win');
    try {
      if (!(await fs.stat(binWinPath)).isDirectory()) throw new Error('not a directory');
    } catch (error: unknown) {
      if (isNodeError(error) && error.code === 'ENOENT') throw new Error(`Bin.Win was not found: ${binWinPath}`);
      throw error;
    }
    await this.files.deleteDirectory(binWinPath);
  }

  private async readSourceConfig(sourcePath: string, required = true): Promise<SourceConfig> {
    try {
      return JSON.parse(await this.files.readText(sourcePath)) as SourceConfig;
    } catch (error: unknown) {
      if (isNodeError(error) && error.code === 'ENOENT') {
        if (!required) return {};
        throw new Error(`Source config not found: ${sourcePath}`);
      }
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Could not read source config: ${message}`);
    }
  }
}