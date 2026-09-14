import type { PropertyDefinition, Template } from '../../types/template';

/**
 * Abstract base class for templates
 * Provides common functionality and structure
 */
export abstract class BaseTemplate implements Template {
  abstract id: string;
  abstract name: string;
  abstract description: string;
  abstract urlPatterns: RegExp[];
  abstract priority: number;
  abstract defaultFolder: string;
  abstract defaultFilename: string;
  abstract properties: PropertyDefinition[];
  abstract contentTemplate: string;
  abstract version: string;

  // All shipped templates are built-in
  isBuiltIn = true;

  /**
   * Extract data from document
   * Must be implemented by subclasses
   */
  abstract extract(doc: Document): Record<string, unknown>;

  /**
   * Helper: Extract text content from element
   */
  protected getText(element: Element | null | undefined): string {
    return element?.textContent?.trim() || '';
  }

  /**
   * Helper: Extract attribute from element
   */
  protected getAttribute(element: Element | null | undefined, attribute: string): string {
    return element?.getAttribute(attribute) || '';
  }

  /**
   * Helper: Query selector with fallback
   */
  protected querySelector(doc: Document, ...selectors: string[]): Element | null {
    for (const selector of selectors) {
      const element = doc.querySelector(selector);
      if (element) return element;
    }
    return null;
  }

  /**
   * Helper: Query all with multiple selectors
   */
  protected querySelectorAll(doc: Document, selector: string): Element[] {
    return Array.from(doc.querySelectorAll(selector));
  }

  /**
   * Helper: Extract URL from various sources
   */
  protected getUrl(doc: Document): string {
    return doc.location?.href || '';
  }

  /**
   * Helper: Parse date from various formats
   */
  protected parseDate(dateString: string): Date | null {
    if (!dateString) return null;

    try {
      const date = new Date(dateString);
      return isNaN(date.getTime()) ? null : date;
    } catch {
      return null;
    }
  }

  /**
   * Helper: Extract number from text (e.g., "123 files" -> 123)
   */
  protected extractNumber(text: string): number {
    const match = text.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  }

  /**
   * Helper: Clean text (remove extra whitespace, normalize)
   */
  protected cleanText(text: string): string {
    return text
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, '\n');
  }

  /**
   * Helper: Check if element is visible
   */
  protected isVisible(element: Element | null): boolean {
    if (!element) return false;

    const style = window.getComputedStyle(element);
    return (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      style.opacity !== '0' &&
      element.getAttribute('aria-hidden') !== 'true'
    );
  }
}
