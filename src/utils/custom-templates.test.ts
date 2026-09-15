import { describe, expect, it } from "vitest";
import { findMatchingCustomTemplate, urlMatchesPattern } from "./custom-templates";

describe("custom template URL matching", () => {
  it("matches host and path wildcards without requiring a protocol", () => {
    expect(
      urlMatchesPattern(
        "https://www.example-recipes.com/pasta?serves=4",
        "*.example-recipes.com/*",
      ),
    ).toBe(true);
    expect(
      urlMatchesPattern("https://example-recipes.com/pasta", "*.example-recipes.com/*"),
    ).toBe(false);
  });

  it("treats punctuation literally and rejects unrelated domains", () => {
    expect(urlMatchesPattern("https://github.com/acme/app/issues/1", "github.com/*/issues/*")).toBe(true);
    expect(urlMatchesPattern("https://githubXcom/acme/app/issues/1", "github.com/*/issues/*")).toBe(false);
  });

  it("prefers the most specific matching custom template", () => {
    const templates = [
      { id: "first", name: "First", description: "", urlPattern: "example.com/*" },
      { id: "second", name: "Second", description: "", urlPattern: "example.com/article/*" },
    ];
    expect(findMatchingCustomTemplate(templates, "https://example.com/article/1")?.id).toBe("second");
  });
});
