export function sectionKey(group: string): string {
  return `section:${group}`;
}

export function categoryKey(group: string, category: string): string {
  return `category:${group}/${category}`;
}

export function navigationTargetId(key: string): string {
  return `option-navigation-${key}`;
}