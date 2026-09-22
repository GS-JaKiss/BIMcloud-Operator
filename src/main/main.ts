import { app, BrowserWindow, nativeTheme } from 'electron';
import { IpcController } from './IpcController';
import { AppStateStore } from './services/AppStateStore';
import { BCBuildService } from './services/BCBuildService';
import { BranchConfigService } from './services/BranchConfigService';
import { MakeService } from './services/MakeService';
import { WindowManager } from './WindowManager';

const windows = new WindowManager();
const ipcController = new IpcController(
  windows,
  new BranchConfigService(),
  new AppStateStore(),
  new BCBuildService(),
  new MakeService()
);
nativeTheme.themeSource = 'dark';
ipcController.register();

void app.whenReady().then(() => {
  windows.create();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) windows.create();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});