import { spawn } from 'node:child_process';
import fs, { type FileHandle } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { StringDecoder } from 'node:string_decoder';
import {
  BC_PRO_COMMAND_FLAGS,
  BC_PRO_COMMANDS,
  type BCBuildOutput,
  type BCProRequest,
  type BCProResult
} from '../../shared/contracts';

export const BC_PRO_RELATIVE_DIRECTORY = path.join('Bin.Win', 'Programs_VS_64.dev', 'BIMcloudProvisioningTool');
export const BC_PRO_SCRIPT_NAME = 'bcpro.cmd';
const MANIFEST_EXTENSIONS = new Set(['.yaml', '.yml']);
// Arguments pass through cmd.exe, so reject characters it would interpret.
const UNSAFE_ARGUMENT = /["%!&|<>^\r\n]/;

const ERROR_CANCELLED = 1223;
const LOG_POLL_INTERVAL_MS = 250;

type OutputListener = (output: BCBuildOutput) => void;
export type BCProExecution = {
  scriptPath: string;
  args: string[];
  workingDirectory: string;
  elevated: boolean;
};
type BCProExecutor = (execution: BCProExecution, onOutput: OutputListener) => Promise<string>;

function createOutputCollector(onOutput: OutputListener): {
  append(stream: BCBuildOutput['stream'], text: string): void;
  text(): string;
} {
  let output = '';
  return {
    append(stream, text) {
      if (!text) return;
      output = `${output}${text}`.slice(-4 * 1024 * 1024);
      onOutput({ stream, text });
    },
    text: () => output.trim()
  };
}

function exitError(code: number | null): Error {
  if (code === ERROR_CANCELLED) return new Error('Administrator permission was not granted.');
  return new Error(`BCPro exited with code ${code ?? 'unknown'}.`);
}

function executeBCPro(execution: BCProExecution, onOutput: OutputListener): Promise<string> {
  return execution.elevated ? executeElevated(execution, onOutput) : executeDirect(execution, onOutput);
}

function executeDirect(
  { scriptPath, args, workingDirectory }: BCProExecution,
  onOutput: OutputListener
): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.env.ComSpec ?? 'cmd.exe', ['/d', '/s', '/c', 'call', scriptPath, ...args], {
      cwd: workingDirectory,
      env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' },
      windowsHide: true
    });
    const output = createOutputCollector(onOutput);
    child.stdout?.on('data', (chunk: Buffer) => output.append('stdout', chunk.toString()));
    child.stderr?.on('data', (chunk: Buffer) => output.append('stderr', chunk.toString()));
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve(output.text());
      else reject(exitError(code));
    });
  });
}

function quoteCmdArgument(value: string): string {
  return /\s/.test(value) ? `"${value}"` : value;
}

function quotePowerShell(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

// Mirrors the elevated branch of bcpro.cmd, but without its trailing pause and with output sent to a log we can tail.
async function executeElevated(
  { args, workingDirectory }: BCProExecution,
  onOutput: OutputListener
): Promise<string> {
  const logPath = path.join(os.tmpdir(), `bcpro-${process.pid}-${Date.now()}.log`);
  const bundledNode = path.join(workingDirectory, 'node.exe');
  const nodePath = await fs.stat(bundledNode).then((stat) => stat.isFile(), () => false) ? bundledNode : 'node';
  const commandLine = [
    `cd /d "${workingDirectory}"`,
    `"${nodePath}" provisioning-tools.js ${args.map(quoteCmdArgument).join(' ')} > "${logPath}" 2>&1`
  ].join(' && ');
  const script = [
    "$ErrorActionPreference = 'Stop'",
    "$ProgressPreference = 'SilentlyContinue'",
    'try {',
    `  $process = Start-Process -FilePath 'cmd.exe' -ArgumentList ${quotePowerShell(`/d /s /c "${commandLine}"`)} `
      + '-Verb RunAs -WindowStyle Hidden -PassThru',
    `} catch { exit ${ERROR_CANCELLED} }`,
    '$null = $process.Handle',
    '$process.WaitForExit()',
    'exit $process.ExitCode'
  ].join('\n');

  const output = createOutputCollector(onOutput);
  const decoder = new StringDecoder('utf8');
  let offset = 0;
  let draining = Promise.resolve();

  async function readNewLogOutput(): Promise<void> {
    let handle: FileHandle;
    try {
      handle = await fs.open(logPath, 'r');
    } catch {
      return;
    }
    try {
      const { size } = await handle.stat();
      if (size <= offset) return;
      const buffer = Buffer.alloc(size - offset);
      const { bytesRead } = await handle.read(buffer, 0, buffer.length, offset);
      offset += bytesRead;
      output.append('stdout', decoder.write(buffer.subarray(0, bytesRead)));
    } finally {
      await handle.close();
    }
  }

  function drain(): Promise<void> {
    draining = draining.then(readNewLogOutput, readNewLogOutput);
    return draining;
  }

  output.append('stdout', 'Requesting administrator permission...\n');
  const timer = setInterval(() => void drain(), LOG_POLL_INTERVAL_MS);
  try {
    const code = await new Promise<number | null>((resolve, reject) => {
      const child = spawn('powershell.exe', [
        '-NoProfile',
        '-NonInteractive',
        '-ExecutionPolicy',
        'Bypass',
        '-EncodedCommand',
        Buffer.from(script, 'utf16le').toString('base64')
      ], { windowsHide: true, stdio: 'ignore' });
      child.on('error', reject);
      child.on('close', resolve);
    });
    clearInterval(timer);
    await drain();
    output.append('stdout', decoder.end());
    if (code !== 0) throw exitError(code);
    return output.text();
  } finally {
    clearInterval(timer);
    await fs.rm(logPath, { force: true }).catch(() => undefined);
  }
}

async function listYamlFiles(directory: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && MANIFEST_EXTENSIONS.has(path.extname(entry.name).toLowerCase()))
      .map((entry) => path.join(directory, entry.name));
  } catch {
    return [];
  }
}

export class BCProService {
  private running = false;

  public constructor(private readonly execute: BCProExecutor = executeBCPro) {}

  public async listManifests(rootPath: string): Promise<string[]> {
    const toolDirectory = path.join(path.resolve(rootPath), BC_PRO_RELATIVE_DIRECTORY);
    const files = [
      ...await listYamlFiles(toolDirectory),
      ...await listYamlFiles(path.join(toolDirectory, 'Features'))
    ];
    return files.map((filePath) => path.relative(toolDirectory, filePath)).sort((a, b) => a.localeCompare(b));
  }

  public async run(
    rootPath: string,
    request: BCProRequest,
    onOutput: OutputListener = () => undefined
  ): Promise<BCProResult> {
    const { command } = request;
    if (!BC_PRO_COMMANDS.includes(command)) throw new Error(`Unsupported BCPro command: ${String(command)}`);
    const allowedFlags = BC_PRO_COMMAND_FLAGS[command];
    const unsupportedFlag = request.flags.find((flag) => !allowedFlags.includes(flag));
    if (unsupportedFlag) throw new Error(`Unsupported BCPro option for ${command}: ${String(unsupportedFlag)}`);
    if (this.running) throw new Error('A BCPro command is already running.');

    const toolDirectory = path.join(path.resolve(rootPath), BC_PRO_RELATIVE_DIRECTORY);
    const scriptPath = path.join(toolDirectory, BC_PRO_SCRIPT_NAME);
    try {
      if (!(await fs.stat(scriptPath)).isFile()) throw new Error('not a file');
    } catch {
      throw new Error(`BCPro was not found: ${scriptPath}. Run BCBuild build-provisioning-tool first.`);
    }

    const args: string[] = [command];
    if (command !== 'clean') args.push(await this.resolveManifest(toolDirectory, request.manifest));
    args.push(...allowedFlags.filter((flag) => request.flags.includes(flag)));
    // Same rule as bcpro.cmd: only detached or stopped runs can skip Windows services.
    const elevated = !args.includes('--detached') && !args.includes('--stopped');
    if (elevated && UNSAFE_ARGUMENT.test(toolDirectory)) {
      throw new Error(`The BCPro folder path contains unsupported characters: ${toolDirectory}`);
    }

    this.running = true;
    try {
      const execution = { scriptPath, args, workingDirectory: toolDirectory, elevated };
      return { command, output: await this.execute(execution, onOutput) };
    } finally {
      this.running = false;
    }
  }

  private async resolveManifest(toolDirectory: string, manifest: string | null): Promise<string> {
    if (!manifest) throw new Error('Select a manifest file for this BCPro command.');
    const manifestPath = path.resolve(toolDirectory, manifest);
    if (!MANIFEST_EXTENSIONS.has(path.extname(manifestPath).toLowerCase())) {
      throw new Error(`The manifest must be a YAML file: ${manifestPath}`);
    }
    if (UNSAFE_ARGUMENT.test(manifestPath)) {
      throw new Error(`The manifest path contains unsupported characters: ${manifestPath}`);
    }
    try {
      if (!(await fs.stat(manifestPath)).isFile()) throw new Error('not a file');
    } catch {
      throw new Error(`The manifest was not found: ${manifestPath}`);
    }
    const relativePath = path.relative(toolDirectory, manifestPath);
    return relativePath.startsWith('..') || path.isAbsolute(relativePath) ? manifestPath : relativePath;
  }
}
