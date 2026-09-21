import { useEffect, useState } from 'react';
import type {
  BCBuildCommand,
  BranchData,
  ConfigOption,
  ConfigValue,
  DiscoveredBranch,
  Overrides
} from '../../shared/contracts';

export type ToastState = {
  title: string;
  message: string;
  error: boolean;
  actionPath: string | null;
};

export type BranchEditorState = {
  branch: BranchData | null;
  discoveredBranches: DiscoveredBranch[];
  overrides: Overrides;
  activeGroup: string;
  search: string;
  showOverridesOnly: boolean;
  bcBuildOutput: string;
  bcBuildOutputVisible: boolean;
  bcBuildRunning: boolean;
  loadingLabel: string | null;
  toast: ToastState | null;
  dirty: boolean;
  setActiveGroup(group: string): void;
  setSearch(search: string): void;
  setShowOverridesOnly(showOverridesOnly: boolean): void;
  chooseRoot(): Promise<void>;
  selectBranch(rootPath: string): Promise<void>;
  runBCBuild(command: BCBuildCommand): Promise<boolean>;
  buildPortal(): Promise<void>;
  refreshBranch(): Promise<void>;
  deleteBinWin(): Promise<void>;
  clearBCBuildOutput(): void;
  setBCBuildOutputVisible(visible: boolean): void;
  reveal(targetPath: string): Promise<void>;
  setIncluded(option: ConfigOption, included: boolean): void;
  setValue(option: ConfigOption, value: ConfigValue): void;
  reset(): void;
  save(): Promise<void>;
  exportConfig(): Promise<void>;
  importConfig(): Promise<void>;
  dismissToast(): void;
};

function getErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/^Error invoking remote method '[^']+': Error: /, '');
}

export function useBranchEditor(): BranchEditorState {
  const [branch, setBranch] = useState<BranchData | null>(null);
  const [discoveredBranches, setDiscoveredBranches] = useState<DiscoveredBranch[]>([]);
  const [overrides, setOverrides] = useState<Overrides>({});
  const [baseline, setBaseline] = useState<Overrides>({});
  const [activeGroup, setActiveGroup] = useState('');
  const [search, setSearch] = useState('');
  const [showOverridesOnly, setShowOverridesOnly] = useState(false);
  const [bcBuildOutput, setBCBuildOutput] = useState('');
  const [bcBuildOutputVisible, setBCBuildOutputVisible] = useState(false);
  const [bcBuildRunning, setBCBuildRunning] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const dirty = JSON.stringify(overrides) !== JSON.stringify(baseline);

  async function loadBranch(rootPath: string): Promise<void> {
    setLoadingLabel('Reading branch');
    try {
      const loadedBranch = await window.branchConfig.load(rootPath);
      setBranch(loadedBranch);
      setOverrides({ ...loadedBranch.overrides });
      setBaseline({ ...loadedBranch.overrides });
      setActiveGroup('');
      setSearch('');
      setShowOverridesOnly(false);
      try {
        setDiscoveredBranches(await window.branchConfig.discover(loadedBranch.rootPath));
      } catch {
        setDiscoveredBranches([]);
      }
    } catch (error: unknown) {
      setToast({
        title: 'Could not open branch',
        message: getErrorMessage(error),
        error: true,
        actionPath: null
      });
    } finally {
      setLoadingLabel(null);
    }
  }

  async function chooseRoot(): Promise<void> {
    const rootPath = await window.branchConfig.chooseRoot();
    if (rootPath) await loadBranch(rootPath);
  }

  async function selectBranch(rootPath: string): Promise<void> {
    if (rootPath && rootPath !== branch?.rootPath) await loadBranch(rootPath);
  }

  async function runBCBuild(command: BCBuildCommand): Promise<boolean> {
    if (!branch || loadingLabel || bcBuildRunning) return false;
    setBCBuildOutput(`> bcbuild.cmd ${command}\n`);
    setBCBuildOutputVisible(true);
    setBCBuildRunning(true);
    try {
      const result = await window.branchConfig.runBCBuild(branch.rootPath, command);
      const outputLines = result.output.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
      const finalLine = outputLines.at(-1);
      setToast({
        title: `BCBuild ${command} completed`,
        message: finalLine || 'The command completed successfully.',
        error: false,
        actionPath: null
      });
      return true;
    } catch (error: unknown) {
      setToast({
        title: `BCBuild ${command} failed`,
        message: getErrorMessage(error),
        error: true,
        actionPath: null
      });
      return false;
    } finally {
      setBCBuildRunning(false);
    }
  }

  async function buildPortal(): Promise<void> {
    if (!branch) return;
    const rootPath = branch.rootPath;
    if (await runBCBuild('build-portal')) await loadBranch(rootPath);
  }

  async function refreshBranch(): Promise<void> {
    if (branch && !bcBuildRunning) await loadBranch(branch.rootPath);
  }

  async function deleteBinWin(): Promise<void> {
    if (!branch || loadingLabel || bcBuildRunning) return;
    setLoadingLabel('Deleting Bin.Win');
    try {
      const deleted = await window.branchConfig.deleteBinWin(branch.rootPath);
      if (deleted) {
        setToast({
          title: 'Bin.Win deleted',
          message: `Deleted ${branch.rootPath}\\Bin.Win.`,
          error: false,
          actionPath: null
        });
        await loadBranch(branch.rootPath);
      }
    } catch (error: unknown) {
      setToast({
        title: 'Could not delete Bin.Win',
        message: getErrorMessage(error),
        error: true,
        actionPath: null
      });
    } finally {
      setLoadingLabel(null);
    }
  }

  async function reveal(targetPath: string): Promise<void> {
    await window.branchConfig.reveal(targetPath);
  }

  function setIncluded(option: ConfigOption, included: boolean): void {
    setOverrides((current) => {
      const next = { ...current };
      if (included) next[option.path] = option.defaultValue;
      else delete next[option.path];
      return next;
    });
  }

  function setValue(option: ConfigOption, value: ConfigValue): void {
    setOverrides((current) => ({ ...current, [option.path]: value }));
  }

  function reset(): void {
    setOverrides({ ...baseline });
  }

  async function save(): Promise<void> {
    if (!branch || !dirty) return;
    setLoadingLabel('Saving XML');
    try {
      const result = await window.branchConfig.save({
        rootPath: branch.rootPath,
        overrides
      });
      setBranch(result.branch);
      setOverrides({ ...result.branch.overrides });
      setBaseline({ ...result.branch.overrides });
      setToast({
        title: 'Configuration saved',
        message: 'A backup was created in the Config Backup folder. The three newest backups are retained.',
        error: false,
        actionPath: result.backupPath
      });
    } catch (error: unknown) {
      setToast({
        title: 'Could not save XML',
        message: getErrorMessage(error),
        error: true,
        actionPath: null
      });
    } finally {
      setLoadingLabel(null);
    }
  }

  async function exportConfig(): Promise<void> {
    if (!branch || loadingLabel) return;
    setLoadingLabel('Saving configuration');
    try {
      const filePath = await window.branchConfig.exportConfig({
        rootPath: branch.rootPath,
        overrides
      });
      if (filePath) {
        setToast({
          title: 'Configuration file saved',
          message: 'The current configuration was saved as a separate Portal Server XML file.',
          error: false,
          actionPath: filePath
        });
      }
    } catch (error: unknown) {
      setToast({
        title: 'Could not save configuration file',
        message: getErrorMessage(error),
        error: true,
        actionPath: null
      });
    } finally {
      setLoadingLabel(null);
    }
  }

  async function importConfig(): Promise<void> {
    if (!branch || loadingLabel) return;
    setLoadingLabel('Loading configuration');
    try {
      const result = await window.branchConfig.importConfig(branch.rootPath);
      if (result) {
        setOverrides({ ...result.overrides });
        setToast({
          title: 'Configuration file loaded',
          message: 'The XML configuration is ready to review. Save XML to apply it to the branch.',
          error: false,
          actionPath: result.filePath
        });
      }
    } catch (error: unknown) {
      setToast({
        title: 'Could not load configuration file',
        message: getErrorMessage(error),
        error: true,
        actionPath: null
      });
    } finally {
      setLoadingLabel(null);
    }
  }

  useEffect(() => {
    return window.branchConfig.onBCBuildOutput((output) => {
      setBCBuildOutput((current) => `${current}${output.text}`.slice(-200_000));
      setBCBuildOutputVisible(true);
    });
  }, []);

  useEffect(() => {
    void window.branchConfig.getLastRoot().then((rootPath) => {
      if (rootPath) void loadBranch(rootPath);
    });
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.ctrlKey && event.key.toLowerCase() === 'f') {
        event.preventDefault();
        document.querySelector<HTMLInputElement>('#search')?.focus();
      }
      if (event.ctrlKey && event.key.toLowerCase() === 's' && dirty) {
        event.preventDefault();
        void save();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  });

  return {
    branch,
    discoveredBranches,
    overrides,
    activeGroup,
    search,
    showOverridesOnly,
    bcBuildOutput,
    bcBuildOutputVisible,
    bcBuildRunning,
    loadingLabel,
    toast,
    dirty,
    setActiveGroup,
    setSearch,
    setShowOverridesOnly,
    chooseRoot,
    selectBranch,
    runBCBuild,
    buildPortal,
    refreshBranch,
    deleteBinWin,
    clearBCBuildOutput: () => setBCBuildOutput(''),
    setBCBuildOutputVisible,
    reveal,
    setIncluded,
    setValue,
    reset,
    save,
    exportConfig,
    importConfig,
    dismissToast: () => setToast(null)
  };
}