export interface QuoteEntry {
  /** Nesting level, where 0 is a top-level reply */
  depth: number;
  /** Header line, such as the author and permalink */
  header: string;
  /** Markdown body */
  body: string;
}

function quotePrefix(level: number): string {
  return level > 0 ? `${Array(level).fill(">").join(" ")} ` : "";
}

/**
 * Render a flat, depth-annotated list of replies as nested Markdown blockquotes.
 * Each reply stays inside its parent's blockquote so the thread structure survives.
 */
export function renderNestedQuotes(entries: QuoteEntry[]): string {
  const lines: string[] = [];
  let previousDepth = -1;

  for (const entry of entries) {
    const depth = Math.max(0, Math.min(entry.depth, previousDepth + 1));
    if (lines.length > 0) {
      // Keep the separator inside the parent's quote so siblings and children stay nested.
      lines.push(quotePrefix(depth).trimEnd());
    }

    const prefix = quotePrefix(depth + 1);
    const body = entry.body.trim();
    lines.push(`${prefix}${entry.header}`);
    if (body) {
      lines.push(prefix.trimEnd());
      for (const line of body.split("\n")) {
        lines.push(line ? `${prefix}${line}` : prefix.trimEnd());
      }
    }
    previousDepth = depth;
  }

  return lines.join("\n");
}
