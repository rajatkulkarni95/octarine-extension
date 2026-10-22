import { BaseTemplate } from "./base-template";
import type { PropertyDefinition } from "../../types/template";
import { PropertyType } from "../../types/template";
import { htmlToMarkdown, cleanMarkdown } from "../markdown-converter";
import { renderNestedQuotes, type QuoteEntry } from "./nested-quotes";

/**
 * Hacker News Thread Template
 * Extracts a story or comment page with its replies as nested blockquotes,
 * from Hacker News itself or the hckrnws.com reader.
 */
class HackerNewsTemplate extends BaseTemplate {
  id = "hackernews";
  name = "Hacker News Thread";
  description = "Extract a Hacker News story with its comment tree as nested quotes";
  urlPatterns = [/news\.ycombinator\.com\/item\?id=\d+/, /hckrnws\.com\/stories\/\d+/];
  priority = 10;
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

{/if}{if:text}{text}

{/if}{if:comments}## Comments

{comments}{/if}`;

  extract(doc: Document): Record<string, unknown> {
    const url = this.getUrl(doc);
    if (/(^|\.)hckrnws\.com$/.test(new URL(url).hostname)) {
      return this.extractHckrnws(doc, url);
    }

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

  /**
   * hckrnws.com has no stable class names or comment IDs in its markup, so this
   * reads the layout: the story card holds the h2 title, and each comment is a
   * <section> indented with margin-left: calc(<n>px * <level>).
   */
  private extractHckrnws(doc: Document, url: string): Record<string, unknown> {
    const card = doc.querySelector("h2")?.parentElement;
    const link = card?.querySelector('a[target="_blank"]') as HTMLAnchorElement | null;
    // The story metadata row shows points, then the comment count, then the age.
    const [points, commentCount] = Array.from(card?.querySelectorAll("span.text-xs.ml-1") ?? [])
      .map((span) => this.extractNumber(this.getText(span)));
    const description = card?.querySelector(":scope > div.text-base");

    const comments: QuoteEntry[] = this.querySelectorAll(doc, 'section[style*="margin-left"]')
      .map((section) => {
        const level = this.getAttribute(section, "style").match(/calc\([^)]*\*\s*(\d+)\)/)?.[1];
        const user = this.getText(section.querySelector(":scope > div > span")) || "[deleted]";
        const content = section.querySelector(":scope > div.text-base");
        const body = content
          ? this.toMarkdown(content)
          : this.getText(section.querySelector(":scope > p")) || "[collapsed]";
        return { depth: level ? parseInt(level, 10) : 0, header: `**${user}**`, body };
      });

    return {
      title: this.getText(card?.querySelector("h2")) || doc.title.replace(/ - hckrnws$/, ""),
      url,
      hnId: url.match(/\/stories\/(\d+)/)?.[1] || "",
      storyUrl: link?.href || "",
      site: this.getText(link).replace(/^\(|\)$/g, ""),
      author: this.getText(card?.querySelector("p span.font-semibold")),
      points: points || undefined,
      commentCount: commentCount ?? comments.length,
      text: description ? this.toMarkdown(description) : "",
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
    // hckrnws strips the leading ">" from quoted paragraphs; restore it to match HN.
    clone.querySelectorAll("p.quotes").forEach((paragraph) => paragraph.prepend(">"));
    clone.querySelectorAll("a[href]").forEach((link) => {
      link.setAttribute("href", (link as HTMLAnchorElement).href);
    });
    return cleanMarkdown(htmlToMarkdown(clone.innerHTML));
  }
}

export const hackerNewsTemplate = new HackerNewsTemplate();
