import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { _electron as electron } from 'playwright-core';
import { BC_BUILD_COMMANDS } from '../src/shared/contracts';

async function runSmokeTest(): Promise<void> {
  const projectRoot = path.resolve(__dirname, '..', '..');
  const fixtureRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'bimcloud-operator-'));
  const sourcePath = path.join(
    fixtureRoot,
    'Sources',
    'TWPortalServer',
    'TeamworkPortalServer',
    'js',
    'config',
    'config.json'
  );
  const xmlPath = path.join(
    fixtureRoot,
    'Bin.Win',
    'Programs.dev',
    'TeamworkPortalServer',
    'Config',
    'PortalServer.config.xml'
  );
  await fs.mkdir(path.dirname(sourcePath), { recursive: true });
  await fs.mkdir(path.dirname(xmlPath), { recursive: true });
  await fs.mkdir(path.join(fixtureRoot, 'Control'));
  await fs.writeFile(sourcePath, JSON.stringify({
    WebUIConfig: {
      jobTimeout: 1200000,
      defaultFileServerPanel: { visible: true, editable: false },
      publicLink: { enabled: false, passwordProtectedLinks: true, expiringLinks: true }
    }
  }));
  await fs.writeFile(
    xmlPath,
    '<configuration><PortalServer><WebUIConfig><publicLink enabled="true"/></WebUIConfig></PortalServer></configuration>'
  );

  const app = await electron.launch({
    args: [projectRoot, `--user-data-dir=${path.join(fixtureRoot, 'user-data')}`]
  });
  try {
    const window = await app.firstWindow();
    await window.waitForLoadState('domcontentloaded');
    assert.equal(await window.title(), 'BIMcloud Operator');
    assert.equal(await window.locator('#choose-root').isVisible(), true);
    assert.equal(await window.locator('#empty-state').isVisible(), true);
    assert.equal(await window.locator('[data-lucide="folder-open"], svg.lucide-folder-open').count() > 0, true);
    await app.evaluate(async ({ dialog }, rootPath): Promise<void> => {
      dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [rootPath] });
    }, fixtureRoot);
    await window.locator('#choose-root').click();
    await window.locator('#editor').waitFor({ state: 'visible' });
    assert.equal(await window.locator('#discovered-branch').isEnabled(), true);
    assert.equal(await window.locator('#discovered-branch option').count(), 1);
    assert.equal(await window.locator('#discovered-branch').inputValue(), fixtureRoot);
    assert.equal(await window.locator('#bcbuild-command option').count(), BC_BUILD_COMMANDS.length);
    assert.equal(await window.locator('#bcbuild-command').inputValue(), 'start-portal');
    assert.equal(await window.locator('#run-bcbuild').isVisible(), true);
    assert.equal(await window.locator('#delete-bin-win').isVisible(), true);
    await app.evaluate(({ BrowserWindow }): void => {
      BrowserWindow.getAllWindows()[0]?.webContents.send('bcbuild:output', {
        stream: 'stdout',
        text: 'Installing BCBuild dependencies...\nStarting portal...\n'
      });
    });
    await window.locator('#bcbuild-console').waitFor({ state: 'visible' });
    assert.match(await window.locator('#bcbuild-console pre').innerText(), /Starting portal/);
    const consoleHeight = await window.locator('#bcbuild-console').evaluate((element) => element.clientHeight);
    await window.getByRole('separator', { name: 'Resize BCBuild output' }).press('ArrowUp');
    assert.equal(
      await window.locator('#bcbuild-console').evaluate((element) => element.clientHeight),
      consoleHeight + 20
    );
    await window.getByRole('button', { name: 'Collapse output' }).click();
    assert.equal(await window.locator('#bcbuild-console').count(), 0);
    await window.locator('#bcbuild-output-toggle').click();
    assert.equal(await window.locator('#bcbuild-console').isVisible(), true);
    assert.equal(await window.locator('.option-row').count(), 6);
    assert.equal(await window.locator('.include-check:checked').count(), 1);
    assert.equal(await window.locator('#xml-target').count(), 0);

    await window.locator('#overrides-only').click();
    assert.equal(await window.locator('#overrides-only').getAttribute('aria-pressed'), 'true');
    assert.equal(await window.locator('.option-row').count(), 1);
    assert.deepEqual(
      await window.locator('.group-button span:first-child').allTextContents(),
      ['WebUIConfig', 'publicLink']
    );
    await window.locator('#overrides-only').click();
    assert.equal(await window.locator('.option-row').count(), 6);

    await window.getByRole('button', { name: /^WebUIConfig/ }).click();
    assert.match(await window.locator('.group-button.active').innerText(), /^WebUIConfig/);
    assert.equal(await window.locator('.option-row').count(), 6);
    const scrollTopBeforeCategoryClick = await window.locator('.content').evaluate((element) => element.scrollTop);
    await window.getByRole('button', { name: /^publicLink/ }).click();
    assert.equal(await window.locator('.option-row').count(), 6);
    await window.waitForFunction((previousScrollTop) => (
      (document.querySelector<HTMLElement>('.content')?.scrollTop ?? 0) > previousScrollTop
    ), scrollTopBeforeCategoryClick);
    assert.equal(await window.locator('#overrides-only').isVisible(), true);
    assert.equal(
      await window.locator('.content-heading').evaluate((element) => getComputedStyle(element).position),
      'sticky'
    );
    await window.locator('#search').fill('enabled');
    assert.equal(await window.locator('.group-button').count(), 2);
    assert.deepEqual(
      await window.locator('.group-button span:first-child').allTextContents(),
      ['WebUIConfig', 'publicLink']
    );
    assert.equal(await window.locator('.option-row').count(), 1);
    await window.locator('.option-row .switch input').uncheck({ force: true });
    assert.equal(await window.locator('#save').isEnabled(), true);
    await window.locator('#save').click();
    await window.waitForFunction(() => document.querySelector<HTMLButtonElement>('#save')?.disabled === true);
    assert.equal(await window.locator('#search').inputValue(), 'enabled');
    assert.match(await window.locator('.group-button.active').innerText(), /^publicLink/);
    assert.equal(await window.locator('.option-row').count(), 1);

    await window.screenshot({ path: path.join(projectRoot, 'test', 'electron-smoke.png'), fullPage: true });
    await app.evaluate(async ({ dialog }): Promise<void> => {
      dialog.showMessageBox = async () => ({ response: 1, checkboxChecked: false });
    });
    await window.locator('#delete-bin-win').click();
    await window.getByText('Bin.Win deleted', { exact: true }).waitFor({ state: 'visible' });
    await assert.rejects(fs.stat(path.join(fixtureRoot, 'Bin.Win')), { code: 'ENOENT' });
    await window.locator('#build-required-state').waitFor({ state: 'visible' });
    assert.equal(await window.locator('#editor').count(), 0);
    assert.equal(await window.locator('#build-portal').isVisible(), true);
    assert.equal(await window.locator('#build-portal').innerText(), 'Build Portal');
    assert.equal(await window.locator('#refresh-branch').isVisible(), true);
    assert.equal(await window.locator('#delete-bin-win').isDisabled(), true);
    console.log('Electron editor transitioned to the build-required state after deleting Bin.Win.');
  } finally {
    await app.close();
    await fs.rm(fixtureRoot, { recursive: true, force: true });
  }
}

runSmokeTest().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});