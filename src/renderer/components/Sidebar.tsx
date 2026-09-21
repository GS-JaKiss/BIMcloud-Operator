import { Search } from 'lucide-react';

export type NavigationSection = {
  key: string;
  name: string;
  selectedCount: number;
  categories: Array<{ key: string; name: string; selectedCount: number }>;
};

type SidebarProps = {
  sections: NavigationSection[];
  activeGroup: string;
  search: string;
  onGroupChange(group: string): void;
  onSearchChange(search: string): void;
};

export function Sidebar({
  sections,
  activeGroup,
  search,
  onGroupChange,
  onSearchChange
}: SidebarProps): React.JSX.Element {
  return (
    <aside className="sidebar">
      <div className="search-wrap">
        <Search />
        <input
          id="search"
          type="search"
          placeholder="Filter options"
          autoComplete="off"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
        />
        <kbd>Ctrl F</kbd>
      </div>
      <nav id="groups" aria-label="Configuration groups">
        {sections.map((section) => (
          <div className="nav-section" key={section.name}>
            <button
              type="button"
              className={`group-button section-button${section.key === activeGroup ? ' active' : ''}`}
              onClick={() => onGroupChange(section.key)}
            >
              <span>{section.name}</span>
              <span className="group-count">{section.selectedCount}</span>
            </button>
            {section.categories.map((category) => (
              <button
                key={category.key}
                type="button"
                className={`group-button category-button${category.key === activeGroup ? ' active' : ''}`}
                onClick={() => onGroupChange(category.key)}
              >
                <span>{category.name}</span>
                <span className="group-count">{category.selectedCount}</span>
              </button>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );
}