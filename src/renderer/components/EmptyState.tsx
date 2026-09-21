import { FileCode2, FolderSearch, SlidersHorizontal } from 'lucide-react';

type EmptyStateProps = {
  onChooseRoot(): void;
};

export function EmptyState({ onChooseRoot }: EmptyStateProps): React.JSX.Element {
  return (
    <main id="empty-state" className="empty-state">
      <div className="empty-graphic" aria-hidden="true">
        <div className="file-sheet"><FileCode2 /></div>
        <div className="connection-line" />
        <div className="toggle-sheet"><SlidersHorizontal /></div>
      </div>
      <h2>Choose a development branch</h2>
      <p>The branch must contain the Portal Server source configuration. If it has not been built yet, you can build it here.</p>
      <button className="button primary" id="empty-choose-root" type="button" onClick={onChooseRoot}>
        <FolderSearch />
        <span>Browse for branch</span>
      </button>
    </main>
  );
}