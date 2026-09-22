import { contextBridge, ipcRenderer } from 'electron';
import type { BCBuildCommand, BCBuildOutput, BranchConfigApi, MakeTarget, SavePayload } from '../shared/contracts';

const branchConfig: BranchConfigApi = {
  chooseRoot: async (): Promise<string | null> => ipcRenderer.invoke('branch:choose') as Promise<string | null>,
  getLastRoot: async (): Promise<string | null> => ipcRenderer.invoke('branch:last-root') as Promise<string | null>,
  discover: async (rootPath: string) => ipcRenderer.invoke('branch:discover', rootPath),
  load: async (rootPath: string) => ipcRenderer.invoke('branch:load', rootPath),
  save: async (payload: SavePayload) => ipcRenderer.invoke('branch:save', payload),
  exportConfig: async (payload: SavePayload) => ipcRenderer.invoke('config:export', payload),
  importConfig: async (rootPath: string) => ipcRenderer.invoke('config:import', rootPath),
  runBCBuild: async (rootPath: string, command: BCBuildCommand) => ipcRenderer.invoke('bcbuild:run', rootPath, command),
  runMake: async (rootPath: string, target: MakeTarget) => ipcRenderer.invoke('make:run', rootPath, target),
  deleteBinWin: async (rootPath: string): Promise<boolean> => ipcRenderer.invoke('branch:delete-bin-win', rootPath),
  onBCBuildOutput: (listener: (output: BCBuildOutput) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, output: BCBuildOutput): void => listener(output);
    ipcRenderer.on('bcbuild:output', handler);
    return () => ipcRenderer.removeListener('bcbuild:output', handler);
  },
  reveal: async (targetPath: string): Promise<void> => {
    await ipcRenderer.invoke('path:reveal', targetPath);
  }
};

contextBridge.exposeInMainWorld('branchConfig', branchConfig);