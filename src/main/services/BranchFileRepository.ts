import type { Dirent } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';

const TARGET_FILE_NAME = 'PortalServer.config.xml';

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error;
}

export class BranchFileRepository {
  public async readText(filePath: string): Promise<string> {
    return fs.readFile(filePath, 'utf8');
  }

  public async deleteDirectory(directoryPath: string): Promise<void> {
    await fs.rm(directoryPath, { recursive: true });
  }

  public async findTargetFiles(rootPath: string): Promise<string[]> {
    const results: string[] = [];
    await this.visit(path.join(rootPath, 'Bin.Win'), results);
    return results.sort((left, right) => left.localeCompare(right));
  }

  public async writeWithBackup(xmlPath: string, contents: string): Promise<string> {
    const backupDirectory = await this.prepareBackupDirectory(xmlPath);
    const backupPath = this.createBackupName(xmlPath, backupDirectory);
    const temporaryPath = `${xmlPath}.tmp`;
    await fs.copyFile(xmlPath, backupPath);
    try {
      await fs.writeFile(temporaryPath, contents, 'utf8');
      await fs.rename(temporaryPath, xmlPath);
    } catch (error: unknown) {
      await fs.rm(temporaryPath, { force: true });
      throw error;
    }

    await this.pruneBackups(xmlPath, backupDirectory, 3);
    return backupPath;
  }

  private async visit(directory: string, results: string[]): Promise<void> {
    let entries: Dirent<string>[];
    try {
      entries = await fs.readdir(directory, { withFileTypes: true });
    } catch (error: unknown) {
      if (isNodeError(error) && (error.code === 'ENOENT' || error.code === 'EACCES')) return;
      throw error;
    }

    await Promise.all(entries.map(async (entry): Promise<void> => {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) await this.visit(entryPath, results);
      else if (entry.isFile() && entry.name.toLowerCase() === TARGET_FILE_NAME.toLowerCase()) {
        results.push(entryPath);
      }
    }));
  }

  private async prepareBackupDirectory(xmlPath: string): Promise<string> {
    const configDirectory = path.dirname(xmlPath);
    const backupDirectory = path.join(configDirectory, 'Config Backup');
    await fs.mkdir(backupDirectory, { recursive: true });

    const extension = path.extname(xmlPath);
    const prefix = `${path.basename(xmlPath, extension)}.backup-`;
    const entries = await fs.readdir(configDirectory, { withFileTypes: true });
    const legacyBackups = entries.filter(
      (entry) => entry.isFile() && entry.name.startsWith(prefix) && entry.name.endsWith(extension)
    );
    await Promise.all(legacyBackups.map((entry) => (
      fs.rename(path.join(configDirectory, entry.name), path.join(backupDirectory, entry.name))
    )));

    return backupDirectory;
  }

  private createBackupName(xmlPath: string, backupDirectory: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const extension = path.extname(xmlPath);
    const baseName = path.basename(xmlPath, extension);
    return path.join(backupDirectory, `${baseName}.backup-${timestamp}${extension}`);
  }

  private async pruneBackups(xmlPath: string, backupDirectory: string, maximumCount: number): Promise<void> {
    const extension = path.extname(xmlPath);
    const baseName = path.basename(xmlPath, extension);
    const prefix = `${baseName}.backup-`;
    const entries = await fs.readdir(backupDirectory, { withFileTypes: true });
    const backups = entries
      .filter((entry) => entry.isFile() && entry.name.startsWith(prefix) && entry.name.endsWith(extension))
      .map((entry) => entry.name)
      .sort((left, right) => right.localeCompare(left));

    await Promise.all(backups.slice(maximumCount).map((fileName) => fs.rm(path.join(backupDirectory, fileName))));
  }
}