import { app } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';

type PersistedState = {
  rootPath?: string;
};

export class AppStateStore {
  public async read(): Promise<PersistedState> {
    try {
      const parsed: unknown = JSON.parse(await fs.readFile(this.statePath(), 'utf8'));
      if (parsed && typeof parsed === 'object' && 'rootPath' in parsed && typeof parsed.rootPath === 'string') {
        return { rootPath: parsed.rootPath };
      }
      return {};
    } catch {
      return {};
    }
  }

  public async write(state: PersistedState): Promise<void> {
    const filePath = this.statePath();
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(state), 'utf8');
  }

  private statePath(): string {
    return path.join(app.getPath('userData'), 'state.json');
  }
}