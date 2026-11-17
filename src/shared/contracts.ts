export type ConfigValue = string | number | boolean;
export type ConfigValueType = 'string' | 'number' | 'boolean';
export type Overrides = Record<string, ConfigValue>;
export const BC_BUILD_COMMANDS = [
  'build-portal',
  'clean-portal',
  'build-portal-server',
  'clean-portal-server',
  'build-portal-ui',
  'clean-portal-ui',
  'build-bimcloud-configurator',
  'clean-bimcloud-configurator',
  'build-provisioning-tool',
  'clean-provisioning-tool',
  'build-tools',
  'clean-tools',
  'build-bimcloud-logs-analyzer-tool',
  'clean-bimcloud-logs-analyzer-tool',
  'run-tenduke-tests',
  'run-portal-server-tests',
  'run-portal-server-cluster-tests',
  'run-gsid-tests',
  'run-portal-server-ui-tests',
  'run-portal-server-ui-ci-sanity-tests',
  'run-portal-server-ui-npm-script',
  'run-jenkins-unittest',
  'run-jenkins-buildtest',
  'run-provisioning-tool-tests',
  'run-native-unit-tests',
  'run-all-tests',
  'run-nostromo',
  'run-coverage',
  'run-portal-server-redis-tests',
  'docker-build-local',
  'docker-build',
  'docker-incremental-build',
  'docker-package-build',
  'docker-clean',
  'docker-clean-branch',
  'docker-build-twct',
  'docker-build-twct-validation',
  'docker-start',
  'docker-start-extui',
  'docker-run-twct',
  'docker-stop',
  'get-gcp-artifacts',
  'localize',
  'localize-portal-ui',
  'start',
  'stop',
  'restart',
  'start-portal',
  'start-portal-10duke',
  'stop-portal',
  'sbs'
] as const;
export type BCBuildCommand = typeof BC_BUILD_COMMANDS[number];
export const MAKE_TARGETS = ['ALL', 'TWJS', 'TWClientBase', 'Installer'] as const;
export type MakeTarget = typeof MAKE_TARGETS[number];
export const BC_PRO_COMMANDS = ['up', 'start', 'stop', 'down', 'dup', 'reset', 'clean'] as const;
export type BCProCommand = typeof BC_PRO_COMMANDS[number];
export const BC_PRO_FLAGS = ['--detached', '--stopped', '--clean', '-v'] as const;
export type BCProFlag = typeof BC_PRO_FLAGS[number];
export const BC_PRO_COMMAND_FLAGS: Record<BCProCommand, readonly BCProFlag[]> = {
  up: ['--detached', '--stopped', '--clean', '-v'],
  start: ['--detached', '-v'],
  stop: ['--detached', '-v'],
  down: ['-v'],
  dup: ['--detached', '--stopped', '--clean', '-v'],
  reset: ['--detached', '--stopped', '--clean', '-v'],
  clean: ['-v']
};

export type BCProRequest = {
  command: BCProCommand;
  manifest: string | null;
  flags: BCProFlag[];
};

export type ConfigOption = {
  path: string;
  group: string;
  category: string;
  label: string;
  defaultValue: ConfigValue;
  sourceValue: ConfigValue;
  type: ConfigValueType;
};

export type BranchData = {
  rootPath: string;
  sourcePath: string;
  xmlPath: string | null;
  options: ConfigOption[];
  overrides: Overrides;
};

export type DiscoveredBranch = {
  name: string;
  rootPath: string;
};

export type SavePayload = {
  rootPath: string;
  overrides: Overrides;
};

export type SaveResult = {
  backupPath: string;
  branch: BranchData;
};

export type BCBuildResult = {
  command: BCBuildCommand;
  output: string;
};

export type MakeResult = {
  target: MakeTarget;
  output: string;
};

export type BCProResult = {
  command: BCProCommand;
  output: string;
};

export type BCBuildOutput = {
  stream: 'stdout' | 'stderr';
  text: string;
};

export type BranchConfigApi = {
  chooseRoot(): Promise<string | null>;
  getLastRoot(): Promise<string | null>;
  discover(rootPath: string): Promise<DiscoveredBranch[]>;
  load(rootPath: string): Promise<BranchData>;
  save(payload: SavePayload): Promise<SaveResult>;
  exportConfig(payload: SavePayload): Promise<string | null>;
  importConfig(rootPath: string): Promise<{ filePath: string; overrides: Overrides } | null>;
  runBCBuild(rootPath: string, command: BCBuildCommand): Promise<BCBuildResult>;
  runMake(rootPath: string, target: MakeTarget): Promise<MakeResult>;
  runBCPro(rootPath: string, request: BCProRequest): Promise<BCProResult>;
  listBCProManifests(rootPath: string): Promise<string[]>;
  chooseBCProManifest(rootPath: string): Promise<string | null>;
  deleteBinWin(rootPath: string): Promise<boolean>;
  onBCBuildOutput(listener: (output: BCBuildOutput) => void): () => void;
  reveal(targetPath: string): Promise<void>;
};