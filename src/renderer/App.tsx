import { ActionBar } from './components/ActionBar';
import { BCBuildConsole } from './components/BCBuildConsole';
import { BranchBar } from './components/BranchBar';
import { BuildRequiredState } from './components/BuildRequiredState';
import { EmptyState } from './components/EmptyState';
import { Header } from './components/Header';
import { LoadingOverlay } from './components/LoadingOverlay';
import { OptionEditor } from './components/OptionEditor';
import { Sidebar } from './components/Sidebar';
import { Toast } from './components/Toast';
import { categoryKey, navigationTargetId, sectionKey } from './configNavigation';
import { useBranchEditor } from './hooks/useBranchEditor';

export function App(): React.JSX.Element {
  const editor = useBranchEditor();
  const normalizedSearch = editor.search.trim().toLowerCase();
  const matchingOptions = editor.branch?.options.filter((option) => (
    (!normalizedSearch || option.path.toLowerCase().includes(normalizedSearch))
      && (!editor.showOverridesOnly || Object.hasOwn(editor.overrides, option.path))
  )) ?? [];
  const navigationSections = [...new Set(matchingOptions.map((option) => option.group))]
    .map((group) => ({
      key: sectionKey(group),
      name: group,
      selectedCount: editor.branch?.options.filter((option) => (
        option.group === group && Object.hasOwn(editor.overrides, option.path)
      )).length ?? 0,
      categories: [...new Set(matchingOptions
        .filter((option) => option.group === group && option.category !== 'General')
        .map((option) => option.category))]
        .map((category) => ({
          key: categoryKey(group, category),
          name: category,
          selectedCount: editor.branch?.options.filter((option) => (
            option.group === group
              && option.category === category
              && Object.hasOwn(editor.overrides, option.path)
          )).length ?? 0
        }))
    }));
  const navigationKeys = navigationSections.flatMap((section) => [
    section.key,
    ...section.categories.map((category) => category.key)
  ]);
  const activeGroup = navigationKeys.includes(editor.activeGroup) ? editor.activeGroup : '';
  const activeGroupLabel = navigationSections.find((section) => section.key === activeGroup)?.name
      ?? navigationSections.flatMap((section) => section.categories.map((category) => ({
        key: category.key,
        label: `${section.name} / ${category.name}`
      }))).find((category) => category.key === activeGroup)?.label
      ?? 'Configuration';

  function handleSearchChange(search: string): void {
    editor.setSearch(search);
    if (!editor.activeGroup || !editor.branch) return;
    const query = search.trim().toLowerCase();
    const activeGroupHasMatches = editor.branch.options.some((option) => (
      (sectionKey(option.group) === editor.activeGroup
        || categoryKey(option.group, option.category) === editor.activeGroup)
        && (!query || option.path.toLowerCase().includes(query))
    ));
    if (!activeGroupHasMatches) editor.setActiveGroup('');
  }

  function handleNavigationChange(group: string): void {
    editor.setActiveGroup(group);
    requestAnimationFrame(() => {
      document.getElementById(navigationTargetId(group))?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    });
  }

  return (
    <>
      <div className="app-shell">
        <Header
          activeRootPath={editor.branch?.rootPath ?? ''}
          branches={editor.discoveredBranches}
          onChooseRoot={() => void editor.chooseRoot()}
          onSelectBranch={(rootPath) => void editor.selectBranch(rootPath)}
        />
        {editor.branch && (
          <BranchBar
            branch={editor.branch}
            bcBuildRunning={editor.bcBuildRunning}
            outputAvailable={Boolean(editor.bcBuildOutput)}
            outputVisible={editor.bcBuildOutputVisible}
            busy={Boolean(editor.loadingLabel)}
            onDeleteBinWin={() => void editor.deleteBinWin()}
            onReveal={(path) => void editor.reveal(path)}
            onRunBCBuild={(command) => void editor.runBCBuild(command)}
            onToggleOutput={() => editor.setBCBuildOutputVisible(!editor.bcBuildOutputVisible)}
          />
        )}
        {!editor.branch ? (
          <EmptyState onChooseRoot={() => void editor.chooseRoot()} />
        ) : (
          <>
            {editor.branch.xmlPath ? (
              <main id="editor" className="editor">
                <Sidebar
                  sections={navigationSections}
                  activeGroup={activeGroup}
                  search={editor.search}
                  onGroupChange={handleNavigationChange}
                  onSearchChange={handleSearchChange}
                />
                <OptionEditor
                  activeGroup={activeGroupLabel}
                  options={matchingOptions}
                  overrides={editor.overrides}
                  showOverridesOnly={editor.showOverridesOnly}
                  onIncludedChange={editor.setIncluded}
                  onShowOverridesOnlyChange={editor.setShowOverridesOnly}
                  onValueChange={editor.setValue}
                />
              </main>
            ) : (
              <BuildRequiredState
                running={editor.bcBuildRunning}
                onBuild={() => void editor.buildPortal()}
                onRefresh={() => void editor.refreshBranch()}
              />
            )}
            {editor.bcBuildOutputVisible && (
              <BCBuildConsole
                output={editor.bcBuildOutput}
                running={editor.bcBuildRunning}
                onClear={editor.clearBCBuildOutput}
                onClose={() => editor.setBCBuildOutputVisible(false)}
              />
            )}
            {editor.branch.xmlPath && (
              <ActionBar
                dirty={editor.dirty}
                onExportConfig={() => void editor.exportConfig()}
                onImportConfig={() => void editor.importConfig()}
                onReset={editor.reset}
                onSave={() => void editor.save()}
              />
            )}
          </>
        )}
      </div>
      {editor.toast && (
        <Toast
          toast={editor.toast}
          onReveal={(path) => void editor.reveal(path)}
          onDismiss={editor.dismissToast}
        />
      )}
      {editor.loadingLabel && <LoadingOverlay label={editor.loadingLabel} />}
    </>
  );
}