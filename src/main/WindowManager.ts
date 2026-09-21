import { BrowserWindow } from 'electron';
import path from 'node:path';

export class WindowManager {
  private window: BrowserWindow | null = null;

  public create(): BrowserWindow {
    this.window = new BrowserWindow({
      width: 1280,
      height: 820,
      minWidth: 900,
      minHeight: 620,
      backgroundColor: '#0d1117',
      title: 'BIMcloud Operator',
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true
      }
    });
    this.window.setMenuBarVisibility(false);
    void this.window.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
    return this.window;
  }

  public get(): BrowserWindow {
    if (!this.window || this.window.isDestroyed()) throw new Error('The application window is not available.');
    return this.window;
  }
}