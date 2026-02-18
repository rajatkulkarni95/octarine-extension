import type { ClipSelection } from "../types";

/**
 * Wrap selected text portions in markdown with ==text== highlight syntax
 * @param fullMarkdown The complete page markdown
 * @param selections Array of selections to highlight
 * @returns Markdown with highlighted portions wrapped in ==text==
 */
export function wrapHighlightsInMarkdown(
  fullMarkdown: string,
  selections: ClipSelection[]
): string {
  if (selections.length === 0) {
    return fullMarkdown;
  }

  let result = fullMarkdown;

  // Sort selections by their position in the markdown (to avoid offset issues)
  // We'll use a simple approach: try to find each selection's text and wrap it
  const selectionsToWrap = selections
    .map((sel) => ({
      text: sel.text.trim(),
      original: sel.text,
    }))
    .filter((sel) => sel.text.length > 0);

  for (const sel of selectionsToWrap) {
    // Escape special regex characters in the text
    const escapedText = escapeRegExp(sel.text);

    // Create a regex to find this exact text
    // Use word boundaries when possible to avoid partial matches
    const regex = new RegExp(escapedText, "g");

    // Check if this text is already wrapped
    const alreadyWrapped = result.includes(`==${sel.text}==`);

    if (!alreadyWrapped) {
      // Replace all occurrences of this text with the highlighted version
      result = result.replace(regex, `==${sel.text}==`);
    }
  }

  return result;
}

/**
 * Escape special regex characters
 */
function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Extract only the highlighted portions from selections
 * @param selections Array of selections
 * @returns Combined highlighted text
 */
export function extractHighlightedText(selections: ClipSelection[]): string {
  if (selections.length === 0) {
    return "";
  }

  return selections
    .map((sel) => sel.text.trim())
    .filter((text) => text.length > 0)
    .join("\n\n---\n\n");
}
