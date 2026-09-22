import { ChevronDown, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const MIN_CONSOLE_HEIGHT = 120;
const DEFAULT_CONSOLE_HEIGHT = 190;
const VIEWPORT_MARGIN = 180;

type BCBuildConsoleProps = {
  output: string;
  running: boolean;
  onClear(): void;
  onClose(): void;
};

export function BCBuildConsole({
  output,
  running,
  onClear,
  onClose
}: BCBuildConsoleProps): React.JSX.Element {
  const outputRef = useRef<HTMLPreElement>(null);
  const [height, setHeight] = useState(DEFAULT_CONSOLE_HEIGHT);

  function clampHeight(nextHeight: number): number {
    return Math.max(MIN_CONSOLE_HEIGHT, Math.min(nextHeight, window.innerHeight - VIEWPORT_MARGIN));
  }

  function handleResizeStart(event: React.PointerEvent<HTMLDivElement>): void {
    const startY = event.clientY;
    const startHeight = height;
    const handle = event.currentTarget;
    handle.setPointerCapture(event.pointerId);

    function handlePointerMove(moveEvent: PointerEvent): void {
      setHeight(clampHeight(startHeight + startY - moveEvent.clientY));
    }

    function handlePointerUp(): void {
      handle.removeEventListener('pointermove', handlePointerMove);
      handle.removeEventListener('pointerup', handlePointerUp);
    }

    handle.addEventListener('pointermove', handlePointerMove);
    handle.addEventListener('pointerup', handlePointerUp);
  }

  function handleResizeKeyDown(event: React.KeyboardEvent<HTMLDivElement>): void {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
    event.preventDefault();
    setHeight((current) => clampHeight(current + (event.key === 'ArrowUp' ? 20 : -20)));
  }

  useEffect(() => {
    const element = outputRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [output]);

  return (
    <section
      className="bcbuild-console"
      id="bcbuild-console"
      aria-label="Command output"
      style={{ height, flexBasis: height }}
    >
      <div
        className="console-resize-handle"
        role="separator"
        aria-label="Resize command output"
        aria-orientation="horizontal"
        aria-valuemin={MIN_CONSOLE_HEIGHT}
        aria-valuemax={Math.max(MIN_CONSOLE_HEIGHT, window.innerHeight - VIEWPORT_MARGIN)}
        aria-valuenow={height}
        tabIndex={0}
        onPointerDown={handleResizeStart}
        onKeyDown={handleResizeKeyDown}
      />
      <header>
        <div className="bcbuild-console-title">
          <span className={`console-state${running ? ' running' : ''}`} />
          <strong>Command output</strong>
          <span>{running ? 'Running' : 'Finished'}</span>
        </div>
        <div className="console-actions">
          <button type="button" title="Clear output" aria-label="Clear output" onClick={onClear}>
            <Trash2 />
          </button>
          <button type="button" title="Collapse output" aria-label="Collapse output" onClick={onClose}>
            <ChevronDown />
          </button>
        </div>
      </header>
      <pre ref={outputRef} role="log" aria-live="polite">{output || 'Waiting for output...'}</pre>
    </section>
  );
}