import { Braces, FolderOpen } from 'lucide-react';
import type { DiscoveredBranch } from '../../shared/contracts';

type HeaderProps = {
  activeRootPath: string;
  branches: DiscoveredBranch[];
  onChooseRoot(): void;
  onSelectBranch(rootPath: string): void;
};

export function Header({ activeRootPath, branches, onChooseRoot, onSelectBranch }: HeaderProps): React.JSX.Element {
  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-mark" aria-hidden="true"><Braces /></div>
        <div>
          <h1>BIMcloud Operator <span className="app-version">v{__APP_VERSION__}</span></h1>
          <p>Build and lifecycle tools</p>
        </div>
      </div>
      <div className="branch-controls">
        <button className="button secondary" id="choose-root" type="button" onClick={onChooseRoot}>
          <FolderOpen />
          <span>Choose branch</span>
        </button>
        <select
          aria-label="Discovered branch"
          className="branch-select"
          id="discovered-branch"
          value={activeRootPath}
          disabled={branches.length === 0}
          onChange={(event) => onSelectBranch(event.target.value)}
        >
          {branches.length === 0 && <option value="">No branches discovered</option>}
          {branches.map((branch) => (
            <option key={branch.rootPath} value={branch.rootPath}>{branch.name}</option>
          ))}
        </select>
      </div>
    </header>
  );
}