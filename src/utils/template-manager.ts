import type { Template, TemplatePreferences, ExtractedData, TemplateMatch } from '../types/template';
import type { Settings } from '../types/settings';
import { renderTemplate } from './template-renderer';
import browser from 'webextension-polyfill';

/**
 * Template Manager
 * Handles template selection, data extraction, and rendering
 */
export class TemplateManager {
  private templates: Map<string, Template> = new Map();
  private preferences: TemplatePreferences = {};
  private settings: Settings | null = null;

  constructor() {
    this.loadPreferences();
  }

  /**
   * Load settings from storage to override template defaults
   * This is called on every extraction to ensure we have the latest settings
   */
  private async loadSettings(): Promise<void> {
    try {
      const result = await browser.storage.local.get('octarine_settings');
      if (result.octarine_settings) {
        this.settings = result.octarine_settings as Settings;
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }

  /**
   * Register a template
   */
  registerTemplate(template: Template): void {
    this.templates.set(template.id, template);
  }

  /**
   * Register multiple templates
   */
  registerTemplates(templates: Template[]): void {
    templates.forEach((t) => this.registerTemplate(t));
  }

  /**
   * Get all registered templates
   */
  getAllTemplates(): Template[] {
    return Array.from(this.templates.values());
  }

  /**
   * Get template by ID
   */
  getTemplate(id: string): Template | undefined {
    return this.templates.get(id);
  }

  /**
   * Select template based on URL (auto-detection)
   */
  selectTemplate(url: string): TemplateMatch | null {
    const matches = Array.from(this.templates.values())
      .map((template) => {
        const matchedPattern = template.urlPatterns.find((pattern) => pattern.test(url));
        return matchedPattern ? { template, pattern: matchedPattern } : null;
      })
      .filter((match) => match !== null)
      .sort((a, b) => b!.template.priority - a!.template.priority);

    if (matches.length === 0) {
      return null;
    }

    return {
      template: matches[0]!.template,
      isAutoDetected: true,
      matchedPattern: matches[0]!.pattern,
    };
  }

  /**
   * Extract data using template
   */
  async extractData(
    doc: Document,
    templateId?: string,
    settingsTemplateId?: string,
  ): Promise<ExtractedData | null> {
    // Reload settings on every extraction to ensure we have the latest
    await this.loadSettings();

    // Determine which template to use
    let template: Template | undefined;

    if (templateId) {
      // Manual selection
      template = this.templates.get(templateId);
      if (!template) {
        console.error(`Template not found: ${templateId}`);
        return null;
      }
    } else {
      // Auto-detect
      const match = this.selectTemplate(doc.location?.href || '');
      if (!match) {
        return null;
      }
      template = match.template;
    }

    try {
      // Get user preferences for this template
      const prefs = this.preferences[template.id] || { propertyToggles: {} };

      // Extract raw data using template's extract function
      const rawData = template.extract(doc);

      if (!rawData) {
        return null;
      }

      // Get user settings for this template (if available)
      const resultTemplateId = settingsTemplateId ?? template.id;
      const templateSettings = this.settings?.templates?.[resultTemplateId];
      const userContentTemplate = templateSettings?.contentTemplate;

      // Check if properties are enabled in settings
      const propertiesEnabled = templateSettings?.propertiesEnabled ?? true;

      // Filter properties based on user toggles and settings
      const enabledProperties = template.properties.filter((prop) => {
        if (!propertiesEnabled) return false;

        // Check if user has overridden the toggle state
        if (Object.prototype.hasOwnProperty.call(prefs.propertyToggles, prop.key)) {
          return prefs.propertyToggles[prop.key];
        }
        // Otherwise use default enabled state
        return prop.enabled;
      });

      // Build properties object with only enabled properties
      const properties: Record<string, unknown> = {};
      enabledProperties.forEach((prop) => {
        if (rawData[prop.key] !== undefined) {
          properties[prop.key] = rawData[prop.key];
        } else if (prop.defaultValue !== undefined) {
          properties[prop.key] = prop.defaultValue;
        }
      });

      // Use user's content template if available, otherwise use template default
      const contentTemplate = userContentTemplate || template.contentTemplate;

      // Render content template with all raw data (not just enabled properties)
      // This allows conditionals to work even if property is disabled
      const content = renderTemplate(contentTemplate, rawData);

      // Determine folder (user settings > preferences > template default)
      const folder = templateSettings?.folder || prefs.folder || template.defaultFolder;

      // Render filename template
      const filename = renderTemplate(template.defaultFilename, rawData);

      return {
        templateId: resultTemplateId,
        title: typeof rawData.title === 'string' && rawData.title ? rawData.title : 'Untitled',
        content,
        properties,
        url: doc.location?.href || '',
        folder,
        filename,
      };
    } catch (error) {
      console.error(`Error extracting data with template ${template.id}:`, error);
      return null;
    }
  }

  /**
   * Load preferences from storage
   */
  private async loadPreferences(): Promise<void> {
    try {
      const result = await browser.storage.sync.get('templatePreferences');
      if (result.templatePreferences) {
        this.preferences = result.templatePreferences as TemplatePreferences;
      }
    } catch (error) {
      console.error('Error loading template preferences:', error);
    }
  }

  /**
   * Save preferences to storage
   */
  async savePreferences(preferences: TemplatePreferences): Promise<void> {
    this.preferences = preferences;
    try {
      await browser.storage.sync.set({ templatePreferences: preferences });
    } catch (error) {
      console.error('Error saving template preferences:', error);
    }
  }

  /**
   * Get preferences for a specific template
   */
  getPreferences(templateId: string): { folder?: string; propertyToggles: Record<string, boolean> } {
    return this.preferences[templateId] || { propertyToggles: {} };
  }

  /**
   * Update preferences for a specific template
   */
  async updatePreferences(
    templateId: string,
    updates: { folder?: string; propertyToggles?: Record<string, boolean> }
  ): Promise<void> {
    const current = this.getPreferences(templateId);

    this.preferences[templateId] = {
      folder: updates.folder !== undefined ? updates.folder : current.folder,
      propertyToggles: updates.propertyToggles !== undefined ? updates.propertyToggles : current.propertyToggles,
    };

    await this.savePreferences(this.preferences);
  }

  /**
   * Toggle a property on/off for a template
   */
  async toggleProperty(templateId: string, propertyKey: string, enabled: boolean): Promise<void> {
    const prefs = this.getPreferences(templateId);
    prefs.propertyToggles[propertyKey] = enabled;
    await this.updatePreferences(templateId, { propertyToggles: prefs.propertyToggles });
  }

  /**
   * Set folder for a template
   */
  async setFolder(templateId: string, folder: string): Promise<void> {
    await this.updatePreferences(templateId, { folder });
  }

  /**
   * Reset preferences for a template to defaults
   */
  async resetPreferences(templateId: string): Promise<void> {
    delete this.preferences[templateId];
    await this.savePreferences(this.preferences);
  }
}

// Singleton instance
let templateManager: TemplateManager | null = null;

/**
 * Get the singleton template manager instance
 */
export function getTemplateManager(): TemplateManager {
  if (!templateManager) {
    templateManager = new TemplateManager();
  }
  return templateManager;
}
