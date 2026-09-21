import type { ConfigOption, ConfigValue, Overrides } from '../../shared/contracts';

type OptionRowProps = {
  option: ConfigOption;
  index: number;
  overrides: Overrides;
  onIncludedChange(option: ConfigOption, included: boolean): void;
  onValueChange(option: ConfigOption, value: ConfigValue): void;
};

export function OptionRow({
  option,
  index,
  overrides,
  onIncludedChange,
  onValueChange
}: OptionRowProps): React.JSX.Element {
  const selected = Object.hasOwn(overrides, option.path);
  const value = selected ? overrides[option.path] ?? option.defaultValue : option.defaultValue;

  return (
    <div className="option-row" style={{ animationDelay: `${Math.min(index * 12, 120)}ms` }}>
      <input
        type="checkbox"
        className="include-check"
        checked={selected}
        title={selected ? 'Remove this override from XML' : 'Include this override in XML'}
        aria-label={`Include ${option.path} in XML`}
        onChange={(event) => onIncludedChange(option, event.target.checked)}
      />
      <div className="option-copy">
        <span className="option-label">{option.label}</span>
        <span className="option-path">{option.path}</span>
      </div>
      {option.type === 'boolean' ? (
        <div className="value-control switch-control">
          <span className="switch-label">{Boolean(value) ? 'True' : 'False'}</span>
          <label className="switch" title={`${option.label} value`}>
            <input
              type="checkbox"
              checked={Boolean(value)}
              disabled={!selected}
              onChange={(event) => onValueChange(option, event.target.checked)}
            />
            <span className="switch-track" />
          </label>
        </div>
      ) : (
        <div className="value-control">
          <input
            type={option.type === 'number' ? 'number' : 'text'}
            value={String(value)}
            disabled={!selected}
            title={option.sourceValue === option.defaultValue ? '' : `Source: ${String(option.sourceValue)}`}
            onChange={(event) => onValueChange(
              option,
              option.type === 'number' ? Number(event.target.value) : event.target.value
            )}
          />
        </div>
      )}
    </div>
  );
}