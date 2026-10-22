import type { CustomTemplate, PropertyType, TemplateSettings } from "../types/settings";
import { normalizePropertyType } from "./properties";

export const TEMPLATE_FILE_VERSION = 1;

const PROPERTY_TYPES: PropertyType[] = ["string", "number", "date", "datetime", "checkbox", "list", "tags"];

/**
 * Shareable template format used by the gallery in /templates and by
 * Settings > Templates > Import / Copy JSON.
 */
export interface TemplateFile {
  schemaVersion: number;
  name: string;
  description?: string;
  urlPattern: string;
  /** Built-in template whose extractor to inherit, e.g. "hackernews" */
  baseTemplateId?: string;
  folder: string;
  propertiesEnabled?: boolean;
  properties?: Array<{ name: string; type: PropertyType; value: string }>;
  contentTemplate: string;
}

export interface ImportedTemplate {
  template: CustomTemplate;
  settings: TemplateSettings;
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`"${field}" must be a non-empty string.`);
  }
  return value.trim();
}

/**
 * Parse and validate a template file. Throws an Error with a user-facing
 * message when the file is invalid.
 */
export function parseTemplateFile(
  json: string,
  knownBaseTemplateIds: string[],
  createId: () => string = () => `custom-${crypto.randomUUID()}`,
): ImportedTemplate {
  let data: Partial<TemplateFile>;
  try {
    data = JSON.parse(json);
  } catch {
    throw new Error("This is not valid JSON.");
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("A template file must be a JSON object.");
  }
  if (data.schemaVersion !== TEMPLATE_FILE_VERSION) {
    throw new Error(`Unsupported schemaVersion. Expected ${TEMPLATE_FILE_VERSION}.`);
  }

  const baseTemplateId = data.baseTemplateId?.trim() || undefined;
  if (baseTemplateId && !knownBaseTemplateIds.includes(baseTemplateId)) {
    throw new Error(
      `This template needs the "${baseTemplateId}" extractor, which this version of the extension does not include. Update the extension and try again.`,
    );
  }

  if (data.properties !== undefined && !Array.isArray(data.properties)) {
    throw new Error('"properties" must be an array.');
  }
  const properties = (data.properties ?? []).map((property, index) => {
    const name = requireString(property?.name, `properties[${index}].name`);
    const type = normalizePropertyType(requireString(property?.type, `properties[${index}].type`));
    if (!PROPERTY_TYPES.includes(type)) {
      throw new Error(`properties[${index}].type "${property.type}" is not supported.`);
    }
    return {
      id: `prop-${index}-${name}`,
      name,
      type,
      value: typeof property.value === "string" ? property.value : "",
    };
  });

  return {
    template: {
      id: createId(),
      name: requireString(data.name, "name"),
      description: typeof data.description === "string" ? data.description.trim() : "",
      urlPattern: requireString(data.urlPattern, "urlPattern"),
      baseTemplateId,
    },
    settings: {
      propertiesEnabled: data.propertiesEnabled ?? properties.length > 0,
      properties,
      contentTemplate: requireString(data.contentTemplate, "contentTemplate"),
      folder: requireString(data.folder, "folder"),
    },
  };
}

/**
 * Serialize a custom template so it can be shared or submitted to the gallery.
 */
export function serializeTemplateFile(template: CustomTemplate, settings: TemplateSettings): string {
  const file: TemplateFile = {
    schemaVersion: TEMPLATE_FILE_VERSION,
    name: template.name,
    description: template.description || undefined,
    urlPattern: template.urlPattern,
    baseTemplateId: template.baseTemplateId,
    folder: settings.folder,
    propertiesEnabled: settings.propertiesEnabled,
    properties: settings.properties.map(({ name, type, value }) => ({ name, type, value })),
    contentTemplate: settings.contentTemplate,
  };
  return `${JSON.stringify(file, null, 2)}\n`;
}
