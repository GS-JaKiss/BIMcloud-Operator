import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import type { Document as XmlDocument, Element as XmlElement } from '@xmldom/xmldom';
import type {
  ConfigOption,
  ConfigValue,
  ConfigValueType,
  Overrides
} from '../../shared/contracts';

export class WebUiConfigMapper {
  public decodeDefault(rawValue: ConfigValue): ConfigValue {
    if (typeof rawValue !== 'string') return rawValue;

    const environmentDefault = rawValue.match(/^\$\{[^,}]+,([^}]*)\}$/);
    if (!environmentDefault) return rawValue;

    const fallback = environmentDefault[1] ?? '';
    if (fallback === 'true') return true;
    if (fallback === 'false') return false;
    if (fallback !== '' && Number.isFinite(Number(fallback))) return Number(fallback);
    return fallback;
  }

  public flattenOptions(value: Record<string, unknown>): ConfigOption[] {
    return this.flattenObject(value, [], []);
  }

  public readOverrides(xml: string, options: ConfigOption[]): Overrides {
    const document = this.parseXml(xml);
    const portalServer = this.getPortalServer(document);
    const overrides: Overrides = {};

    for (const option of options) {
      const segments = option.path.split('.');
      const attributeName = segments.pop();
      if (!attributeName) continue;
      const element = this.elementForPath(portalServer, segments, false, document);
      if (element?.hasAttribute(attributeName)) {
        overrides[option.path] = this.coerceXmlValue(element.getAttribute(attributeName) ?? '', option);
      }
    }
    return overrides;
  }

  public applyOverrides(xml: string, options: ConfigOption[], overrides: Overrides): string {
    const document = this.parseXml(xml);
    const portalServer = this.getPortalServer(document);

    for (const option of options) {
      const segments = option.path.split('.');
      const attributeName = segments.pop();
      if (!attributeName) continue;
      const isSelected = Object.hasOwn(overrides, option.path);
      const element = this.elementForPath(portalServer, segments, isSelected, document);
      if (!element) continue;

      if (isSelected) element.setAttribute(attributeName, String(overrides[option.path]));
      else {
        element.removeAttribute(attributeName);
        this.pruneEmptyAncestors(element, portalServer);
      }
    }

    return new XMLSerializer().serializeToString(document);
  }

  public validateXml(xml: string): void {
    this.parseXml(xml);
  }

  private flattenObject(
    value: Record<string, unknown>,
    segments: string[],
    options: ConfigOption[]
  ): ConfigOption[] {
    for (const [key, childValue] of Object.entries(value)) {
      const childSegments = [...segments, key];
      if (childValue !== null && typeof childValue === 'object' && !Array.isArray(childValue)) {
        this.flattenObject(childValue as Record<string, unknown>, childSegments, options);
        continue;
      }

      if (Array.isArray(childValue) || childValue === null || !['string', 'number', 'boolean'].includes(typeof childValue)) {
        continue;
      }

      const sourceValue = childValue as ConfigValue;
      const defaultValue = this.decodeDefault(sourceValue);
      options.push({
        path: childSegments.join('.'),
        group: childSegments.length > 1 ? childSegments[0] ?? 'General' : 'General',
        category: childSegments.length > 2 ? childSegments[1] ?? 'General' : 'General',
        label: key,
        defaultValue,
        sourceValue,
        type: typeof defaultValue as ConfigValueType
      });
    }
    return options;
  }

  private parseXml(xml: string): XmlDocument {
    const errors: string[] = [];
    let document: XmlDocument;
    try {
      document = new DOMParser({
        onError: (level: string, message: string): void => {
          if (level !== 'warning') errors.push(message);
        }
      }).parseFromString(xml, 'application/xml');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Invalid XML: ${message}`);
    }

    if (errors.length > 0 || document.documentElement?.nodeName === 'parsererror') {
      throw new Error(`Invalid XML: ${errors[0] ?? 'unable to parse document'}`);
    }
    return document;
  }

  private directChild(parent: XmlElement, name: string): XmlElement | null {
    for (let index = 0; index < parent.childNodes.length; index += 1) {
      const child = parent.childNodes[index];
      if (child?.nodeType === 1 && child.nodeName === name) return child as XmlElement;
    }
    return null;
  }

  private getPortalServer(document: XmlDocument): XmlElement {
    const portalServer = document.getElementsByTagName('PortalServer')[0];
    if (!portalServer) throw new Error('The XML does not contain a PortalServer element.');
    return portalServer;
  }

  private elementForPath(
    root: XmlElement,
    segments: string[],
    create: boolean,
    document: XmlDocument
  ): XmlElement | null {
    let current = root;
    for (const segment of segments) {
      let child = this.directChild(current, segment);
      if (!child && create) {
        child = document.createElement(segment);
        current.appendChild(child);
      }
      if (!child) return null;
      current = child;
    }
    return current;
  }

  private coerceXmlValue(rawValue: string, option: ConfigOption): ConfigValue {
    if (option.type === 'boolean') return rawValue === 'true';
    if (option.type === 'number') {
      const numberValue = Number(rawValue);
      return Number.isFinite(numberValue) ? numberValue : option.defaultValue;
    }
    return rawValue;
  }

  private hasMeaningfulContent(element: XmlElement): boolean {
    if (element.attributes.length > 0) return true;
    for (let index = 0; index < element.childNodes.length; index += 1) {
      const child = element.childNodes[index];
      if (child?.nodeType === 1 || (child?.nodeType === 3 && child.textContent?.trim())) return true;
    }
    return false;
  }

  private pruneEmptyAncestors(element: XmlElement, root: XmlElement): void {
    let current: XmlElement | null = element;
    while (current && current !== root && !this.hasMeaningfulContent(current)) {
      const parent: XmlElement | null = current.parentNode as XmlElement | null;
      parent?.removeChild(current);
      current = parent;
    }
  }
}