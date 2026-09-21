import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { BCBuildService, BC_BUILD_RELATIVE_PATH } from '../src/main/services/BCBuildService';
import {
  BranchConfigService,
  DEVELOPMENT_CONFIG_PATH,
  SOURCE_CONFIG_PATH,
  TIMER_CONFIG_PATH
} from '../src/main/services/BranchConfigService';
import { WebUiConfigMapper } from '../src/main/services/WebUiConfigMapper';

const mapper = new WebUiConfigMapper();

const sourceWebUi = {
  jobTimeout: 1200000,
  panel: { visible: true, title: 'Projects' },
  publicLink: {
    enabled: '${PORTAL_SERVER_PUBLIC_LINK_ENABLE,false}',
    expiringLinks: true
  }
};

const sourceConfig = {
  WebUIConfig: sourceWebUi
};

const developmentConfig = {
  development: {
    enablePublicAccess: false,
    ws: false
  },
  debug: {
    processName: '${PORTAL_SERVER_DEBUG_PROCESS_NAME}',
    brk: '${PORTAL_SERVER_DEBUG_BRK,false}'
  }
};

const timerConfig = {
  timers: {
    cleanupInterval: 30000
  }
};

const sampleXml = `<?xml version="1.0"?>
<configuration>
  <PortalServer>
    <Server port="22000"/>
    <WebUIConfig>
      <publicLink enabled="true" expiringLinks="true" unknown="keep-me"/>
    </WebUIConfig>
    <development enablePublicAccess="true"/>
    <Unrelated/>
  </PortalServer>
</configuration>`;

test('decodes environment fallbacks and flattens all config leaves', () => {
  assert.equal(mapper.decodeDefault('${FEATURE_ENABLED,false}'), false);
  assert.equal(mapper.decodeDefault('${TIMEOUT,3000}'), 3000);
  assert.equal(mapper.decodeDefault('${VALUE}'), '${VALUE}');

  const options = mapper.flattenOptions({ ...sourceConfig, ...developmentConfig });
  assert.equal(options.length, 9);
  assert.deepEqual(options.find((option) => option.path === 'WebUIConfig.publicLink.enabled'), {
    path: 'WebUIConfig.publicLink.enabled',
    group: 'WebUIConfig',
    category: 'publicLink',
    label: 'enabled',
    defaultValue: false,
    sourceValue: '${PORTAL_SERVER_PUBLIC_LINK_ENABLE,false}',
    type: 'boolean'
  });
});

test('reads typed overrides and changes known attributes across config sections', () => {
  const options = mapper.flattenOptions({ ...sourceConfig, ...developmentConfig });
  assert.deepEqual(mapper.readOverrides(sampleXml, options), {
    'WebUIConfig.publicLink.enabled': true,
    'WebUIConfig.publicLink.expiringLinks': true,
    'development.enablePublicAccess': true
  });

  const updated = mapper.applyOverrides(sampleXml, options, {
    'WebUIConfig.jobTimeout': 9000,
    'WebUIConfig.panel.visible': false,
    'WebUIConfig.panel.title': 'Files',
    'WebUIConfig.publicLink.expiringLinks': false,
    'development.ws': true,
    'debug.brk': true
  });

  assert.match(updated, /<Server port="22000"\/>/);
  assert.match(updated, /<WebUIConfig jobTimeout="9000">/);
  assert.match(updated, /<panel visible="false" title="Files"\/>/);
  assert.match(updated, /<publicLink expiringLinks="false" unknown="keep-me"\/>/);
  assert.match(updated, /<development ws="true"\/>/);
  assert.match(updated, /<debug brk="true"\/>/);
  assert.match(updated, /<Unrelated\/>/);
  assert.doesNotMatch(updated, /publicLink enabled=/);
});

test('discovers sibling branches by their required directories', async (context) => {
  const service = new BranchConfigService();
  const searchRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'branch-discovery-'));
  context.after(async (): Promise<void> => fs.rm(searchRoot, { recursive: true, force: true }));

  async function createCandidate(name: string, markers: string[]): Promise<string> {
    const candidatePath = path.join(searchRoot, name);
    await Promise.all(markers.map((marker) => fs.mkdir(path.join(candidatePath, marker), { recursive: true })));
    return candidatePath;
  }

  const betaPath = await createCandidate('Beta', ['Sources', 'Control', 'Bin.Win']);
  const alphaPath = await createCandidate('Alpha', ['Sources', 'Control', 'Bin.Win']);
  await createCandidate('MissingControl', ['Sources', 'Bin.Win']);
  const unbuiltPath = await createCandidate('Unbuilt', ['Sources', 'Control']);

  assert.deepEqual(await service.discoverBranches(betaPath), [
    { name: 'Alpha', rootPath: alphaPath },
    { name: 'Beta', rootPath: betaPath },
    { name: 'Unbuilt', rootPath: unbuiltPath }
  ]);
});

test('loads source options when the branch has not been built yet', async (context) => {
  const service = new BranchConfigService();
  const rootPath = await fs.mkdtemp(path.join(os.tmpdir(), 'unbuilt-branch-'));
  context.after(async (): Promise<void> => fs.rm(rootPath, { recursive: true, force: true }));
  const sourcePath = path.join(rootPath, SOURCE_CONFIG_PATH);
  await fs.mkdir(path.dirname(sourcePath), { recursive: true });
  await fs.mkdir(path.join(rootPath, 'Control'));
  await fs.writeFile(sourcePath, JSON.stringify(sourceConfig));

  const branch = await service.loadBranch(rootPath);

  assert.equal(branch.xmlPath, null);
  assert.equal(branch.options.length, 5);
  assert.deepEqual(branch.overrides, {});
});

test('rejects a selected folder without Sources and Control branch markers', async (context) => {
  const service = new BranchConfigService();
  const rootPath = await fs.mkdtemp(path.join(os.tmpdir(), 'invalid-branch-'));
  context.after(async (): Promise<void> => fs.rm(rootPath, { recursive: true, force: true }));
  await fs.mkdir(path.join(rootPath, 'Sources'));

  await assert.rejects(
    service.loadBranch(rootPath),
    /Expected Sources and Control folders/
  );
});

test('deletes only Bin.Win from a valid development branch', async (context) => {
  const service = new BranchConfigService();
  const rootPath = await fs.mkdtemp(path.join(os.tmpdir(), 'delete-bin-win-'));
  context.after(async (): Promise<void> => fs.rm(rootPath, { recursive: true, force: true }));
  await Promise.all([
    fs.mkdir(path.join(rootPath, 'Sources')),
    fs.mkdir(path.join(rootPath, 'Control')),
    fs.mkdir(path.join(rootPath, 'Bin.Win', 'Programs.dev'), { recursive: true })
  ]);
  const markerPath = path.join(rootPath, 'keep.txt');
  await fs.writeFile(markerPath, 'keep');

  await service.deleteBinWin(rootPath);

  await assert.rejects(fs.stat(path.join(rootPath, 'Bin.Win')), { code: 'ENOENT' });
  assert.equal(await fs.readFile(markerPath, 'utf8'), 'keep');
});

test('runs only supported BCBuild commands from the selected branch', async (context) => {
  const rootPath = await fs.mkdtemp(path.join(os.tmpdir(), 'bcbuild-service-'));
  context.after(async (): Promise<void> => fs.rm(rootPath, { recursive: true, force: true }));
  const scriptPath = path.join(rootPath, BC_BUILD_RELATIVE_PATH);
  await fs.mkdir(path.dirname(scriptPath), { recursive: true });
  await fs.writeFile(scriptPath, '@echo off');
  const calls: Array<{ scriptPath: string; command: string; workingDirectory: string }> = [];
  const streamedOutput: string[] = [];
  const service = new BCBuildService(async (calledScriptPath, command, workingDirectory, onOutput) => {
    calls.push({ scriptPath: calledScriptPath, command, workingDirectory });
    onOutput({ stream: 'stdout', text: 'Installing\n' });
    onOutput({ stream: 'stderr', text: 'Warning\n' });
    return 'Portal started';
  });

  assert.deepEqual(await service.run(rootPath, 'start-portal', (output) => streamedOutput.push(output.text)), {
    command: 'start-portal',
    output: 'Portal started'
  });
  assert.deepEqual(calls, [{
    scriptPath,
    command: 'start-portal',
    workingDirectory: path.join(rootPath, 'Sources', 'TWServerTools', 'BCBuild')
  }]);
  assert.deepEqual(streamedOutput, ['Installing\n', 'Warning\n']);
  await assert.rejects(
    service.run(rootPath, 'delete-everything' as never),
    /Unsupported BCBuild command/
  );
});

test('discovers a branch, saves its XML target, and retains three backups', async (context) => {
  const service = new BranchConfigService();
  const rootPath = await fs.mkdtemp(path.join(os.tmpdir(), 'webui-config-'));
  context.after(async (): Promise<void> => fs.rm(rootPath, { recursive: true, force: true }));
  const sourcePath = path.join(rootPath, SOURCE_CONFIG_PATH);
  const developmentSourcePath = path.join(rootPath, DEVELOPMENT_CONFIG_PATH);
  const timerSourcePath = path.join(rootPath, TIMER_CONFIG_PATH);
  const xmlPath = path.join(
    rootPath,
    'Bin.Win',
    'Programs.dev',
    'TeamworkPortalServer',
    'Config',
    'PortalServer.config.xml'
  );
  await fs.mkdir(path.dirname(sourcePath), { recursive: true });
  await fs.mkdir(path.dirname(xmlPath), { recursive: true });
  await fs.mkdir(path.join(rootPath, 'Control'));
  await fs.writeFile(sourcePath, JSON.stringify(sourceConfig));
  await fs.writeFile(developmentSourcePath, JSON.stringify(developmentConfig));
  await fs.writeFile(timerSourcePath, JSON.stringify(timerConfig));
  await fs.writeFile(xmlPath, sampleXml);

  const branch = await service.loadBranch(rootPath);
  assert.equal(branch.xmlPath, xmlPath);
  assert.equal(branch.options.length, 10);
  assert.equal(branch.options.some((option) => option.path === 'development.enablePublicAccess'), true);
  assert.equal(branch.options.some((option) => option.path === 'debug.brk'), true);
  assert.equal(branch.options.some((option) => option.path === 'timers.cleanupInterval'), true);

  const backupPrefix = path.join(path.dirname(xmlPath), 'PortalServer.config.backup-');
  await fs.writeFile(`${backupPrefix}2026-01-01T00-00-00-000Z.xml`, 'oldest');
  await fs.writeFile(`${backupPrefix}2026-02-01T00-00-00-000Z.xml`, 'middle');
  await fs.writeFile(`${backupPrefix}2026-03-01T00-00-00-000Z.xml`, 'newest');

  const result = await service.saveBranch({
    rootPath,
    overrides: {
      'WebUIConfig.panel.visible': false,
      'development.enablePublicAccess': true,
      'debug.brk': true,
      'timers.cleanupInterval': 45000
    }
  });
  assert.match(await fs.readFile(xmlPath, 'utf8'), /<panel visible="false"\/>/);
  assert.match(await fs.readFile(xmlPath, 'utf8'), /<development enablePublicAccess="true"\/>/);
  assert.match(await fs.readFile(xmlPath, 'utf8'), /<debug brk="true"\/>/);
  assert.match(await fs.readFile(xmlPath, 'utf8'), /<timers cleanupInterval="45000"\/>/);
  assert.equal(await fs.readFile(result.backupPath, 'utf8'), sampleXml);
  const backupDirectory = path.join(path.dirname(xmlPath), 'Config Backup');
  assert.equal(path.dirname(result.backupPath), backupDirectory);
  const backups = (await fs.readdir(backupDirectory))
    .filter((fileName) => fileName.startsWith('PortalServer.config.backup-'))
    .sort();
  assert.equal(backups.length, 3);
  assert.equal(backups.includes('PortalServer.config.backup-2026-01-01T00-00-00-000Z.xml'), false);
  assert.equal(backups.includes(path.basename(result.backupPath)), true);
  const adjacentBackups = (await fs.readdir(path.dirname(xmlPath)))
    .filter((fileName) => fileName.startsWith('PortalServer.config.backup-'));
  assert.equal(adjacentBackups.length, 0);
});

test('exports and imports a PortalServer XML configuration', async (context) => {
  const service = new BranchConfigService();
  const rootPath = await fs.mkdtemp(path.join(os.tmpdir(), 'saved-webui-config-'));
  context.after(async (): Promise<void> => fs.rm(rootPath, { recursive: true, force: true }));
  const sourcePath = path.join(rootPath, SOURCE_CONFIG_PATH);
  const xmlPath = path.join(rootPath, 'Bin.Win', 'PortalServer.config.xml');
  const savedConfigPath = path.join(rootPath, 'saved-PortalServer.config.xml');
  await fs.mkdir(path.dirname(sourcePath), { recursive: true });
  await fs.mkdir(path.dirname(xmlPath), { recursive: true });
  await fs.mkdir(path.join(rootPath, 'Control'));
  await fs.writeFile(sourcePath, JSON.stringify(sourceConfig));
  await fs.writeFile(xmlPath, sampleXml);

  const overrides = {
    'WebUIConfig.panel.visible': false,
    'WebUIConfig.panel.title': 'Files'
  };
  await service.exportConfig(savedConfigPath, { rootPath, overrides });
  const savedXml = await fs.readFile(savedConfigPath, 'utf8');
  assert.match(savedXml, /<panel visible="false" title="Files"\/>/);
  assert.doesNotMatch(savedXml, /publicLink enabled=/);
  assert.deepEqual(await service.importConfig(savedConfigPath, rootPath), overrides);

  await fs.writeFile(savedConfigPath, '<not-valid');
  await assert.rejects(service.importConfig(savedConfigPath, rootPath), /Invalid XML/);
});