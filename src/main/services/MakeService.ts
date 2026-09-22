import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  MAKE_TARGETS,
  type BCBuildOutput,
  type MakeResult,
  type MakeTarget
} from '../../shared/contracts';

export const MAKE_SCRIPT_RELATIVE_PATH = path.join('Control', 'MakeWin.bat');

type OutputListener = (output: BCBuildOutput) => void;
type MakeExecutor = (
  scriptPath: string,
  target: MakeTarget,
  workingDirectory: string,
  onOutput: OutputListener
) => Promise<string>;

function executeMake(
  scriptPath: string,
  target: MakeTarget,
  workingDirectory: string,
  onOutput: OutputListener
): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.env.ComSpec ?? 'cmd.exe', [
      '/d',
      '/s',
      '/c',
      'call',
      scriptPath,
      'BUILD',
      target
    ], {
      cwd: workingDirectory,
      env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' },
      windowsHide: true
    });
    let output = '';

    function append(stream: BCBuildOutput['stream'], chunk: Buffer): void {
      const text = chunk.toString();
      output = `${output}${text}`.slice(-4 * 1024 * 1024);
      onOutput({ stream, text });
    }

    child.stdout?.on('data', (chunk: Buffer) => append('stdout', chunk));
    child.stderr?.on('data', (chunk: Buffer) => append('stderr', chunk));
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve(output.trim());
      else reject(new Error(`Make exited with code ${code ?? 'unknown'}.`));
    });
  });
}

export class MakeService {
  private running = false;

  public constructor(private readonly execute: MakeExecutor = executeMake) {}

  public async run(
    rootPath: string,
    target: MakeTarget,
    onOutput: OutputListener = () => undefined
  ): Promise<MakeResult> {
    if (!MAKE_TARGETS.includes(target)) throw new Error(`Unsupported Make target: ${String(target)}`);
    if (this.running) throw new Error('A Make command is already running.');

    const normalizedRoot = path.resolve(rootPath);
    const scriptPath = path.join(normalizedRoot, MAKE_SCRIPT_RELATIVE_PATH);
    const workingDirectory = path.dirname(scriptPath);
    try {
      if (!(await fs.stat(scriptPath)).isFile()) throw new Error('not a file');
    } catch {
      throw new Error(`MakeWin.bat was not found: ${scriptPath}`);
    }

    this.running = true;
    try {
      return { target, output: await this.execute(scriptPath, target, workingDirectory, onOutput) };
    } finally {
      this.running = false;
    }
  }
}