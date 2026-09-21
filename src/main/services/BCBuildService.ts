import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  BC_BUILD_COMMANDS,
  type BCBuildCommand,
  type BCBuildOutput,
  type BCBuildResult
} from '../../shared/contracts';

export const BC_BUILD_RELATIVE_PATH = path.join(
  'Sources',
  'TWServerTools',
  'BCBuild',
  'bin',
  'bcbuild.cmd'
);

type OutputListener = (output: BCBuildOutput) => void;
type BCBuildExecutor = (
  scriptPath: string,
  command: BCBuildCommand,
  workingDirectory: string,
  onOutput: OutputListener
) => Promise<string>;

function executeBCBuild(
  scriptPath: string,
  command: BCBuildCommand,
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
      command
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
      else reject(new Error(`BCBuild exited with code ${code ?? 'unknown'}.`));
    });
  });
}

export class BCBuildService {
  private running = false;

  public constructor(private readonly execute: BCBuildExecutor = executeBCBuild) {}

  public async run(
    rootPath: string,
    command: BCBuildCommand,
    onOutput: OutputListener = () => undefined
  ): Promise<BCBuildResult> {
    if (!BC_BUILD_COMMANDS.includes(command)) throw new Error(`Unsupported BCBuild command: ${String(command)}`);
    if (this.running) throw new Error('A BCBuild command is already running.');

    const normalizedRoot = path.resolve(rootPath);
    const scriptPath = path.join(normalizedRoot, BC_BUILD_RELATIVE_PATH);
    const workingDirectory = path.dirname(path.dirname(scriptPath));
    try {
      if (!(await fs.stat(scriptPath)).isFile()) throw new Error('not a file');
    } catch {
      throw new Error(`BCBuild was not found: ${scriptPath}`);
    }

    this.running = true;
    try {
      return { command, output: await this.execute(scriptPath, command, workingDirectory, onOutput) };
    } finally {
      this.running = false;
    }
  }
}