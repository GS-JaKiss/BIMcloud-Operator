import path from 'node:path';
import fs from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const packageJson = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, 'package.json'), 'utf8')
) as { version: string };

export default defineConfig({
  root: path.resolve(__dirname, 'src', 'renderer'),
  base: './',
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version)
  },
  build: {
    outDir: path.resolve(__dirname, 'dist', 'renderer'),
    emptyOutDir: false
  }
});