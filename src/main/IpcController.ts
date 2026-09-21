import path from 'node:path';
import { dialog, ipcMain, shell } from 'electron';
import type { IpcMainInvokeEvent } from 'electron';
import type { BCBuildCommand, SavePayload } from '../shared/contracts';
import { AppStateStore } from './services/AppStateStore';
import { BCBuildService } from './services/BCBuildService';
import { BranchConfigService } from './services/BranchConfigService';
import { WindowManager } from './WindowManager';

export class IpcController {
  public constructor(
    private readonly windows: WindowManager,
    private readonly branchService: BranchConfigService,
    private readonly stateStore: AppStateStore,
    private readonly bcBuildService: BCBuildService
  ) {}

  public register(): void {
    ipcMain.handle('branch:choose', async (): Promise<string | null> => {
      const state = await this.stateStore.read();
      const result = await dialog.showOpenDialog(this.windows.get(), {
        title: 'Choose development branch root',
        defaultPath: state.rootPath,
        properties: ['openDirectory']
      });
      return result.canceled ? null : result.filePaths[0] ?? null;
    });

    ipcMain.handle('branch:last-root', async (): Promise<string | null> => {
      return (await this.stateStore.read()).rootPath ?? null;
    });

    ipcMain.handle(
      'branch:discover',
      async (_event: IpcMainInvokeEvent, rootPath: string) => this.branchService.discoverBranches(rootPath)
    );

    ipcMain.handle(
      'branch:load',
      async (_event: IpcMainInvokeEvent, rootPath: string) => {
        const branch = await this.branchService.loadBranch(rootPath);
        await this.stateStore.write({ rootPath: branch.rootPath });
        return branch;
      }
    );

    ipcMain.handle(
      'branch:save',
      async (_event: IpcMainInvokeEvent, payload: SavePayload) => this.branchService.saveBranch(payload)
    );

    ipcMain.handle(
      'config:export',
      async (_event: IpcMainInvokeEvent, payload: SavePayload): Promise<string | null> => {
        const result = await dialog.showSaveDialog(this.windows.get(), {
          title: 'Save configuration',
          defaultPath: path.join(payload.rootPath, 'PortalServer.config.xml'),
          filters: [{ name: 'Portal Server configuration', extensions: ['xml'] }]
        });
        if (result.canceled || !result.filePath) return null;
        await this.branchService.exportConfig(result.filePath, payload);
        return result.filePath;
      }
    );

    ipcMain.handle(
      'config:import',
      async (_event: IpcMainInvokeEvent, rootPath: string) => {
        const result = await dialog.showOpenDialog(this.windows.get(), {
          title: 'Load saved configuration',
          defaultPath: rootPath,
          properties: ['openFile'],
          filters: [{ name: 'Portal Server configuration', extensions: ['xml'] }]
        });
        const filePath = result.filePaths[0];
        if (result.canceled || !filePath) return null;
        return {
          filePath,
          overrides: await this.branchService.importConfig(filePath, rootPath)
        };
      }
    );

    ipcMain.handle(
      'bcbuild:run',
      async (event: IpcMainInvokeEvent, rootPath: string, command: BCBuildCommand) => (
        this.bcBuildService.run(rootPath, command, (output) => {
          if (!event.sender.isDestroyed()) event.sender.send('bcbuild:output', output);
        })
      )
    );

    ipcMain.handle(
      'branch:delete-bin-win',
      async (_event: IpcMainInvokeEvent, rootPath: string): Promise<boolean> => {
        const binWinPath = path.join(path.resolve(rootPath), 'Bin.Win');
        const result = await dialog.showMessageBox(this.windows.get(), {
          type: 'warning',
          title: 'Delete Bin.Win?',
          message: 'Permanently delete Bin.Win?',
          detail: `This will recursively delete ${binWinPath}. This action cannot be undone.`,
          buttons: ['Cancel', 'Delete Bin.Win'],
          defaultId: 0,
          cancelId: 0,
          noLink: true
        });
        if (result.response !== 1) return false;
        await this.branchService.deleteBinWin(rootPath);
        return true;
      }
    );

    ipcMain.handle('path:reveal', (_event: IpcMainInvokeEvent, targetPath: string): void => {
      shell.showItemInFolder(targetPath);
    });
  }
}