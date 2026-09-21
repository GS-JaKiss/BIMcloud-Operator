type LoadingOverlayProps = {
  label: string;
};

export function LoadingOverlay({ label }: LoadingOverlayProps): React.JSX.Element {
  return (
    <div id="loading" className="loading" aria-live="polite">
      <div className="spinner" />
      <span>{label}</span>
    </div>
  );
}