import { Play, SquareTerminal, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { BC_BUILD_COMMANDS, MAKE_TARGETS, type BCBuildCommand, type MakeTarget } from '../../shared/contracts';
import type { BranchData } from '../../shared/contracts';

type BranchBarProps = {
  branch: BranchData;
  bcBuildRunning: boolean;
  outputAvailable: boolean;
  outputVisible: boolean;
  busy: boolean;
  onDeleteBinWin(): void;
  onReveal(path: string): void;
  onRunBCBuild(command: BCBuildCommand): void;
  onRunMake(target: MakeTarget): void;
  onToggleOutput(): void;
};

export function BranchBar({
  branch,
  bcBuildRunning,
  outputAvailable,
  outputVisible,
  busy,
  onDeleteBinWin,
  onReveal,
  onRunBCBuild,
  onRunMake,
  onToggleOutput
}: BranchBarProps): React.JSX.Element {
  const [command, setCommand] = useState<BCBuildCommand>('start-portal');
  const [makeTarget, setMakeTarget] = useState<MakeTarget>('ALL');

  return (
    <section className="branch-strip" id="branch-strip">
      <div className="path-block">
        <span className="eyebrow">Development branch</span>
        <button className="path-button" id="reveal-root" type="button" onClick={() => onReveal(branch.rootPath)}>
          {branch.rootPath}
        </button>
      </div>
      <div className="build-controls">
        <div className="bcbuild-controls">
          <label htmlFor="make-target">Make</label>
          <select
            id="make-target"
            value={makeTarget}
            onChange={(event) => setMakeTarget(event.target.value as MakeTarget)}
          >
            {MAKE_TARGETS.map((target) => <option key={target} value={target}>{target}</option>)}
          </select>
          <button
            className="button secondary"
            id="run-make"
            type="button"
            disabled={bcBuildRunning}
            onClick={() => onRunMake(makeTarget)}
          >
            <Play />
            <span>{bcBuildRunning ? 'Running' : 'Run'}</span>
          </button>
        </div>
        <div className="bcbuild-controls">
          <label htmlFor="bcbuild-command">BCBuild</label>
          <select
            id="bcbuild-command"
            value={command}
            onChange={(event) => setCommand(event.target.value as BCBuildCommand)}
          >
            {BC_BUILD_COMMANDS.map((availableCommand) => (
              <option key={availableCommand} value={availableCommand}>{availableCommand}</option>
            ))}
          </select>
          <button
            className="button secondary"
            id="bcbuild-output-toggle"
            type="button"
            disabled={!outputAvailable}
            aria-pressed={outputVisible}
            onClick={onToggleOutput}
          >
            <SquareTerminal />
            <span>Output</span>
          </button>
          <button
            className="button secondary"
            id="run-bcbuild"
            type="button"
            disabled={bcBuildRunning}
            onClick={() => onRunBCBuild(command)}
          >
            <Play />
            <span>{bcBuildRunning ? 'Running' : 'Run'}</span>
          </button>
          <button
            className="button danger"
            id="delete-bin-win"
            type="button"
            disabled={busy || bcBuildRunning || !branch.xmlPath}
            onClick={onDeleteBinWin}
          >
            <Trash2 />
            <span>Delete Bin.Win</span>
          </button>
        </div>
      </div>
    </section>
  );
}