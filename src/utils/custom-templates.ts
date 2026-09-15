import type { CustomTemplate } from "../types/settings";

function escapeRegExp(value: string): string {
  return value.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
}

export function urlMatchesPattern(url: string, pattern: string): boolean {
  const trimmedPattern = pattern.trim();
  if (!trimmedPattern) return false;

  try {
    const parsedUrl = new URL(url);
    const target = trimmedPattern.includes("://")
      ? parsedUrl.href
      : `${parsedUrl.host}${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
    const expression = escapeRegExp(trimmedPattern).replace(/\*/g, ".*");
    return new RegExp(`^${expression}$`, "i").test(target);
  } catch {
    return false;
  }
}

export function findMatchingCustomTemplate(
  templates: CustomTemplate[],
  url: string,
): CustomTemplate | undefined {
  return templates
    .filter((template) => urlMatchesPattern(url, template.urlPattern))
    .sort((a, b) =>
      b.urlPattern.replace(/\*/g, "").length - a.urlPattern.replace(/\*/g, "").length
    )[0];
}
