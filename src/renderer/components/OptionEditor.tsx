import { ListFilter } from 'lucide-react';
import type { ConfigOption, ConfigValue, Overrides } from '../../shared/contracts';
import { categoryKey, navigationTargetId, sectionKey } from '../configNavigation';
import { OptionRow } from './OptionRow';

type OptionEditorProps = {
  activeGroup: string;
  options: ConfigOption[];
  overrides: Overrides;
  showOverridesOnly: boolean;
  onIncludedChange(option: ConfigOption, included: boolean): void;
  onShowOverridesOnlyChange(showOverridesOnly: boolean): void;
  onValueChange(option: ConfigOption, value: ConfigValue): void;
};

export function OptionEditor({
  activeGroup,
  options,
  overrides,
  showOverridesOnly,
  onIncludedChange,
  onShowOverridesOnlyChange,
  onValueChange
}: OptionEditorProps): React.JSX.Element {
  const sections = [...new Set(options.map((option) => option.group))].map((group) => ({
    name: group,
    categories: [...new Set(options
      .filter((option) => option.group === group)
      .map((option) => option.category))].map((category) => ({
        name: category,
        options: options.filter((option) => option.group === group && option.category === category)
      }))
  }));

  return (
    <section className="content">
      <div className="content-heading">
        <div>
          <span className="eyebrow">Portal Server configuration</span>
          <h2 id="group-title">{activeGroup}</h2>
        </div>
        <div className="content-tools">
          <button
            aria-pressed={showOverridesOnly}
            className="selection-count"
            id="overrides-only"
            type="button"
            onClick={() => onShowOverridesOnlyChange(!showOverridesOnly)}
          >
            <strong id="selected-count">{Object.keys(overrides).length}</strong>
            <span>overrides</span>
          </button>
        </div>
      </div>
      <div id="option-list" className="option-groups">
        {sections.map((section) => (
          <section
            className="option-section"
            id={navigationTargetId(sectionKey(section.name))}
            key={section.name}
          >
            <h3>{section.name}</h3>
            {section.categories.map((category) => (
              <div
                className="option-category"
                id={navigationTargetId(categoryKey(section.name, category.name))}
                key={category.name}
              >
                <h4>{category.name}</h4>
                <div className="option-list">
                  {category.options.map((option, index) => (
                    <OptionRow
                      key={option.path}
                      option={option}
                      index={index}
                      overrides={overrides}
                      onIncludedChange={onIncludedChange}
                      onValueChange={onValueChange}
                    />
                  ))}
                </div>
              </div>
            ))}
          </section>
        ))}
      </div>
      {options.length === 0 && (
        <div id="no-results" className="no-results">
          <ListFilter />
          <p>No options match this filter.</p>
        </div>
      )}
    </section>
  );
}