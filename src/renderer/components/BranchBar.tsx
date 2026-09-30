import { FolderOpen, Play, SquareTerminal, Trash2 } from 'lucide-react';
import { useState } from 'react';
import {
  BC_BUILD_COMMANDS,
  BC_PRO_COMMAND_FLAGS,
  BC_PRO_COMMANDS,
  BC_PRO_FLAGS,
  MAKE_TARGETS,
  type BCBuildCommand,
  type BCProCommand,
  type BCProFlag,
  type BCProRequest,
  type MakeTarget
} from '../../shared/contracts';
import type { BranchData } from '../../shared/contracts';
import {
  BC_BUILD_COMMAND_DESCRIPTIONS,
  BC_PRO_COMMAND_DESCRIPTIONS,
  BC_PRO_FLAG_DESCRIPTIONS
} from '../commandDescriptions';

const DEFAULT_MANIFEST = 'Features\\paired.yaml';

type BranchBarProps = {
  branch: BranchData;
  bcBuildRunning: boolean;
  bcProManifests: string[];
  outputAvailable: boolean;
  outputVisible: boolean;
  busy: boolean;
  onDeleteBinWin(): void;
  onReveal(path: string): void;
  onRunBCBuild(command: BCBuildCommand): void;
  onRunMake(target: MakeTarget): void;
  onRunBCPro(request: BCProRequest): void;
  onChooseBCProManifest(): Promise<string | null>;
  onToggleOutput(): void;
};

export function BranchBar({
  branch,
  bcBuildRunning,
  bcProManifests,
  outputAvailable,
  outputVisible,
  busy,
  onDeleteBinWin,
  onReveal,
  onRunBCBuild,
  onRunMake,
  onRunBCPro,
  onChooseBCProManifest,
  onToggleOutput
}: BranchBarProps): React.JSX.Element {
  const [command, setCommand] = useState<BCBuildCommand>('start-portal');
  const [makeTarget, setMakeTarget] = useState<MakeTarget>('ALL');
  const [bcProCommand, setBCProCommand] = useState<BCProCommand>('up');
  const [bcProFlags, setBCProFlags] = useState<BCProFlag[]>(['--detached']);
  const [chosenManifest, setChosenManifest] = useState('');
  const manifest = bcProManifests.includes(chosenManifest)
    ? chosenManifest
    : bcProManifests.find((candidate) => candidate === DEFAULT_MANIFEST) ?? bcProManifests[0] ?? '';
  const allowedFlags = BC_PRO_COMMAND_FLAGS[bcProCommand];
  const manifestRequired = bcProCommand !== 'clean';

  function toggleFlag(flag: BCProFlag, enabled: boolean): void {
    setBCProFlags((current) => (enabled ? [...current, flag] : current.filter((value) => value !== flag)));
  }

  async function chooseManifest(): Promise<void> {
    const selected = await onChooseBCProManifest();
    if (selected) setChosenManifest(selected);
  }

  function runBCPro(): void {
    onRunBCPro({
      command: bcProCommand,
      manifest: manifestRequired ? manifest || null : null,
      flags: bcProFlags.filter((flag) => allowedFlags.includes(flag))
    });
  }

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
            title={BC_BUILD_COMMAND_DESCRIPTIONS[command]}
            value={command}
            onChange={(event) => setCommand(event.target.value as BCBuildCommand)}
          >
            {BC_BUILD_COMMANDS.map((availableCommand) => (
              <option key={availableCommand} value={availableCommand} title={BC_BUILD_COMMAND_DESCRIPTIONS[availableCommand]}>
                {availableCommand}
              </option>
            ))}
          </select>
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
        </div>
        <div className="bcbuild-controls">
          <label htmlFor="bcpro-command">BCPro</label>
          <select
            id="bcpro-command"
            className="compact"
            title={BC_PRO_COMMAND_DESCRIPTIONS[bcProCommand]}
            value={bcProCommand}
            onChange={(event) => setBCProCommand(event.target.value as BCProCommand)}
          >
            {BC_PRO_COMMANDS.map((availableCommand) => (
              <option key={availableCommand} value={availableCommand} title={BC_PRO_COMMAND_DESCRIPTIONS[availableCommand]}>
                {availableCommand}
              </option>
            ))}
          </select>
          <select
            id="bcpro-manifest"
            aria-label="BCPro manifest"
            title={manifest ? `Manifest describing the portal and model servers to deploy:\n${manifest}` : undefined}
            value={manifest}
            disabled={!manifestRequired || bcProManifests.length === 0}
            onChange={(event) => setChosenManifest(event.target.value)}
          >
            {bcProManifests.length === 0 && <option value="">No manifests found</option>}
            {bcProManifests.map((candidate) => <option key={candidate} value={candidate}>{candidate}</option>)}
          </select>
          <button
            className="button secondary icon-only"
            id="bcpro-choose-manifest"
            type="button"
            title="Choose manifest file"
            aria-label="Choose manifest file"
            disabled={!manifestRequired}
            onClick={() => void chooseManifest()}
          >
            <FolderOpen />
          </button>
          <div className="bcpro-flags" role="group" aria-label="BCPro options">
            {BC_PRO_FLAGS.map((flag) => (
              <label
                key={flag}
                className="bcpro-flag"
                title={allowedFlags.includes(flag)
                  ? BC_PRO_FLAG_DESCRIPTIONS[flag]
                  : `${BC_PRO_FLAG_DESCRIPTIONS[flag]}\nNot available for ${bcProCommand}.`}
              >
                <input
                  type="checkbox"
                  checked={bcProFlags.includes(flag)}
                  disabled={!allowedFlags.includes(flag)}
                  onChange={(event) => toggleFlag(flag, event.target.checked)}
                />
                <span>{flag}</span>
              </label>
            ))}
          </div>
          <button
            className="button secondary"
            id="run-bcpro"
            type="button"
            disabled={bcBuildRunning || (manifestRequired && !manifest)}
            onClick={runBCPro}
          >
            <Play />
            <span>{bcBuildRunning ? 'Running' : 'Run'}</span>
          </button>
        </div>
      </div>
    </section>
  );
}