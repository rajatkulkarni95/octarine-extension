import type { PropertyDefinition, PropertyType } from "../types/settings";
import type { PageData } from "../types";

export interface ResolvedProperty {
  id: string;
  name: string;
  type: PropertyType;
  value: string;
}

/**
 * Resolves a template variable like {{title}} or {{og:image}} using page data
 */
export function resolveTemplateVariable(
  template: string,
  pageData: PageData | null
): string {
  if (!template || !pageData) return template || "";

  // Extract all variables from the template
  const variablePattern = /\{\{([^}]+)\}\}/g;
  
  return template.replace(variablePattern, (_match, variable) => {
    const key = variable.trim();
    
    // Handle special variables
    switch (key) {
      case "title":
        return pageData.title || "";
      case "url":
      case "source":
        return pageData.url || "";
      case "author":
        return pageData.author || pageData.metadata?.author || "";
      case "published":
        return pageData.publishedDate || pageData.metadata?.published || new Date().toISOString().split("T")[0];
      case "description":
        return pageData.description || pageData.metadata?.description || "";
      case "siteName":
        return pageData.siteName || pageData.metadata?.siteName || "";
      case "clippedAt":
        return new Date().toISOString().split("T")[0];
      case "tags":
        return pageData.metadata?.tags?.join(", ") || "";
      case "image":
        return pageData.metadata?.image || "";
      default:
        // Handle OpenGraph and Twitter meta tags
        if (key.startsWith("og:") || key.startsWith("twitter:")) {
          // These would need to be extracted from pageData.metadata
          // For now, check if there's a matching key in metadata
          const metaKey = key.replace(":", "_") as keyof typeof pageData.metadata;
          if (pageData.metadata && metaKey in pageData.metadata) {
            const val = pageData.metadata[metaKey as keyof typeof pageData.metadata];
            return Array.isArray(val) ? val.join(", ") : (val || "");
          }
        }
        return "";
    }
  });
}

/**
 * Resolves all property definitions using page data
 */
export function resolveProperties(
  properties: PropertyDefinition[],
  pageData: PageData | null
): ResolvedProperty[] {
  return properties.map((prop) => ({
    id: prop.id,
    name: prop.name,
    type: prop.type,
    value: resolveTemplateVariable(prop.value, pageData),
  }));
}

/**
 * Converts resolved properties to a record for the payload
 */
export function propertiesToRecord(
  properties: ResolvedProperty[]
): Record<string, string | string[]> {
  const record: Record<string, string | string[]> = {};
  
  for (const prop of properties) {
    if (prop.type === "list") {
      // Split comma-separated values into an array
      record[prop.name] = prop.value
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
    } else {
      record[prop.name] = prop.value;
    }
  }
  
  return record;
}

/**
 * Converts resolved properties back to PageMetadata format for backward compatibility
 */
export function propertiesToMetadata(
  properties: ResolvedProperty[]
): Record<string, string | string[] | undefined> {
  const metadata: Record<string, string | string[] | undefined> = {};
  
  for (const prop of properties) {
    if (prop.type === "list") {
      metadata[prop.name] = prop.value
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
    } else {
      metadata[prop.name] = prop.value || undefined;
    }
  }
  
  return metadata;
}
