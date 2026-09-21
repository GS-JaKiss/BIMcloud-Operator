import { FileDown, FolderOpen, RotateCcw, Save } from 'lucide-react';

type ActionBarProps = {
  dirty: boolean;
  onReset(): void;
  onSave(): void;
  onExportConfig(): void;
  onImportConfig(): void;
};

export function ActionBar({
  dirty,
  onReset,
  onSave,
  onExportConfig,
  onImportConfig
}: ActionBarProps): React.JSX.Element {
  return (
    <footer id="actionbar" className="actionbar">
      <div className="save-state">
        <span className={`state-dot${dirty ? ' dirty' : ''}`} id="state-dot" />
        <span id="state-label">{dirty ? 'Unsaved XML changes' : 'No unsaved changes'}</span>
      </div>
      <div className="actions">
        <button className="button secondary" id="load-config" type="button" onClick={onImportConfig}>
          <FolderOpen />
          <span>Load Config</span>
        </button>
        <button className="button secondary" id="save-config" type="button" onClick={onExportConfig}>
          <FileDown />
          <span>Save Config</span>
        </button>
        <button className="button ghost" id="reset" type="button" disabled={!dirty} onClick={onReset}>
          <RotateCcw />
          <span>Reset</span>
        </button>
        <button className="button primary" id="save" type="button" disabled={!dirty} onClick={onSave}>
          <Save />
          <span>Save XML</span>
        </button>
      </div>
    </footer>
  );
}