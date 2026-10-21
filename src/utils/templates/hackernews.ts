import { BaseTemplate } from "./base-template";
import type { PropertyDefinition } from "../../types/template";
import { PropertyType } from "../../types/template";
import { htmlToMarkdown, cleanMarkdown } from "../markdown-converter";
import { renderNestedQuotes, type QuoteEntry } from "./nested-quotes";

/**
 * Hacker News Thread Template
 * Extracts a story or comment page with its replies as nested blockquotes.
 * Optional: only used when a gallery template is imported in Settings.
 */
class HackerNewsTemplate extends BaseTemplate {
  id = "hackernews";
  name = "Hacker News Thread";
  description = "Extract a Hacker News story with its comment tree as nested quotes";
  urlPatterns = [/news\.ycombinator\.com\/item\?id=\d+/];
  priority = 10;
  optional = true;
  defaultFolder = "Social/Hacker News";
  defaultFilename = "hn-{hnId}";
  version = "1.0.0";

  properties: PropertyDefinition[] = [
    { key: "hnId", displayName: "Item ID", type: PropertyType.String, required: true, enabled: true },
    { key: "storyUrl", displayName: "Story URL", type: PropertyType.URL, required: false, enabled: true },
    { key: "site", displayName: "Site", type: PropertyType.String, required: false, enabled: true },
    { key: "author", displayName: "Author", type: PropertyType.String, required: false, enabled: true },
    { key: "points", displayName: "Points", type: PropertyType.Number, required: false, enabled: true },
    { key: "commentCount", displayName: "Comments", type: PropertyType.Number, required: false, enabled: true },
    { key: "published", displayName: "Published", type: PropertyType.Date, required: false, enabled: true },
  ];

  contentTemplate = `{if:storyUrl}[{storyUrl}]({storyUrl})
{/if}
{if:text}{text}
{/if}
{if:comments}## Comments

{comments}{/if}`;

  extract(doc: Document): Record<string, unknown> {
    const url = this.getUrl(doc);
    const hnId = new URL(url).searchParams.get("id") || "";
    const fatItem = doc.querySelector("table.fatitem");

    const titleLink = fatItem?.querySelector(".titleline > a") as HTMLAnchorElement | null;
    const storyHref = titleLink?.href || "";
    const storyUrl = storyHref && !/news\.ycombinator\.com\/item\?/.test(storyHref) ? storyHref : "";

    // A comment permalink page has a comment in the fat item instead of a story.
    const author = this.getText(fatItem?.querySelector(".hnuser"));
    const onStory = this.getText(fatItem?.querySelector(".onstory a"));
    const title = this.getText(titleLink)
      || (onStory ? `Comment by ${author} on ${onStory}` : doc.title.replace(/ \| Hacker News$/, ""));

    const textElement = fatItem?.querySelector(".toptext, .commtext");
    const text = textElement ? this.toMarkdown(textElement) : "";

    const comments: QuoteEntry[] = this.querySelectorAll(doc, "table.comment-tree tr.athing.comtr")
      .map((row) => this.extractComment(row));

    return {
      title,
      url,
      hnId,
      storyUrl,
      site: this.getText(fatItem?.querySelector(".sitestr")),
      author,
      points: this.extractNumber(this.getText(fatItem?.querySelector(".score"))) || undefined,
      commentCount: comments.length,
      published: this.parseAge(fatItem?.querySelector(".age")),
      text,
      comments: renderNestedQuotes(comments),
    };
  }

  private extractComment(row: Element): QuoteEntry {
    const depth = parseInt(row.querySelector("td.ind")?.getAttribute("indent") || "0", 10) || 0;
    const user = this.getText(row.querySelector(".comhead .hnuser")) || "[deleted]";
    const age = row.querySelector(".comhead .age");
    const ageLink = age?.querySelector("a") as HTMLAnchorElement | null;
    // Prefer the absolute date; the visible "3 hours ago" goes stale once saved.
    const date = this.parseAge(age) || this.getText(ageLink);
    const header = ageLink?.href ? `**${user}** · [${date}](${ageLink.href})` : `**${user}**`;

    const commentText = row.querySelector(".commtext");
    const body = commentText
      ? this.toMarkdown(commentText)
      : this.getText(row.querySelector(".comment")) || "[deleted]";

    return { depth, header, body };
  }

  private parseAge(element: Element | null | undefined): string | undefined {
    // HN stores "2026-10-21T10:00:00 1761040800" in the title attribute.
    const timestamp = this.getAttribute(element, "title").split(" ")[0];
    const date = this.parseDate(timestamp ? `${timestamp}Z` : "");
    return date ? date.toISOString().split("T")[0] : undefined;
  }

  private toMarkdown(element: Element): string {
    const clone = element.cloneNode(true) as Element;
    clone.querySelectorAll(".reply").forEach((reply) => reply.remove());
    clone.querySelectorAll("a[href]").forEach((link) => {
      link.setAttribute("href", (link as HTMLAnchorElement).href);
    });
    return cleanMarkdown(htmlToMarkdown(clone.innerHTML));
  }
}

export const hackerNewsTemplate = new HackerNewsTemplate();
