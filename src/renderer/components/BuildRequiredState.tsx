import { Hammer, Play, RefreshCw } from 'lucide-react';

type BuildRequiredStateProps = {
  running: boolean;
  onBuild(): void;
  onRefresh(): void;
};

export function BuildRequiredState({
  running,
  onBuild,
  onRefresh
}: BuildRequiredStateProps): React.JSX.Element {
  return (
    <main id="build-required-state" className="empty-state">
      <div className="build-required-icon" aria-hidden="true"><Hammer /></div>
      <h2>No Portal Server configuration found</h2>
      <p>Build Portal to create <strong>Bin.Win</strong> and its <strong>PortalServer.config.xml</strong>.</p>
      <div className="build-required-actions">
        <button className="button primary" id="build-portal" type="button" disabled={running} onClick={onBuild}>
          <Play />
          <span>{running ? 'Building Portal' : 'Build Portal'}</span>
        </button>
        <button className="button secondary" id="refresh-branch" type="button" disabled={running} onClick={onRefresh}>
          <RefreshCw />
          <span>Check again</span>
        </button>
      </div>
    </main>
  );
}