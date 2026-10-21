import { BaseTemplate } from "./base-template";
import type { PropertyDefinition } from "../../types/template";
import { PropertyType } from "../../types/template";
import { htmlToMarkdown, cleanMarkdown } from "../markdown-converter";
import { renderNestedQuotes, type QuoteEntry } from "./nested-quotes";

interface Post {
  name: string;
  handle: string;
  permalink: string;
  date: string;
  body: string;
  /** Index of the conversation group the post was rendered in */
  group: number;
  article: Element;
}

/**
 * X (Twitter) Thread Template
 * Extracts a post, the author's own thread continuation, and the visible
 * replies as nested blockquotes.
 * Optional: only used when a gallery template is imported in Settings.
 */
class XThreadTemplate extends BaseTemplate {
  id = "x-thread";
  name = "X Thread";
  description = "Extract an X post and thread with replies as nested quotes";
  urlPatterns = [/(?:x|twitter)\.com\/[^/]+\/status\/\d+/];
  priority = 10;
  optional = true;
  defaultFolder = "Social/X";
  defaultFilename = "{handle}-{statusId}";
  version = "1.0.0";

  properties: PropertyDefinition[] = [
    { key: "statusId", displayName: "Post ID", type: PropertyType.String, required: true, enabled: true },
    { key: "author", displayName: "Author", type: PropertyType.String, required: false, enabled: true },
    { key: "handle", displayName: "Handle", type: PropertyType.String, required: false, enabled: true },
    { key: "published", displayName: "Published", type: PropertyType.Date, required: false, enabled: true },
    { key: "likes", displayName: "Likes", type: PropertyType.Number, required: false, enabled: true },
    { key: "reposts", displayName: "Reposts", type: PropertyType.Number, required: false, enabled: true },
    { key: "views", displayName: "Views", type: PropertyType.Number, required: false, enabled: true },
    { key: "replyCount", displayName: "Replies", type: PropertyType.Number, required: false, enabled: true },
  ];

  contentTemplate = `{if:context}## In reply to

{context}

{/if}{thread}
{if:replies}
## Replies

{replies}{/if}`;

  extract(doc: Document): Record<string, unknown> {
    const url = this.getUrl(doc);
    const statusId = url.match(/\/status\/(\d+)/)?.[1] || "";
    const posts = this.collectPosts(doc);

    const focalIndex = Math.max(0, posts.findIndex((post) => post.permalink.includes(`/status/${statusId}`)));
    const focal = posts[focalIndex];

    // The author's consecutive self-replies continue the thread.
    let threadEnd = focalIndex + 1;
    while (threadEnd < posts.length && focal && posts[threadEnd].handle === focal.handle) {
      threadEnd++;
    }
    const thread = posts.slice(focalIndex, threadEnd);

    const context: QuoteEntry[] = posts.slice(0, focalIndex)
      .map((post, index) => ({ depth: index, ...this.toQuote(post) }));

    // X separates reply chains with non-post cells, so a post's position in
    // its group is its depth in the chain.
    const replies: QuoteEntry[] = [];
    let currentGroup = -1;
    let depth = 0;
    for (const post of posts.slice(threadEnd)) {
      depth = post.group === currentGroup ? depth + 1 : 0;
      currentGroup = post.group;
      replies.push({ depth, ...this.toQuote(post) });
    }

    const stats = this.parseStats(focal?.article);
    const fallbackTitle = focal ? `${focal.name} on X` : "X post";

    return {
      title: doc.title.replace(/ \/ (X|Twitter)$/, "").trim() || fallbackTitle,
      url,
      statusId,
      author: focal?.name,
      handle: focal?.handle,
      published: focal?.date || undefined,
      ...stats,
      replyCount: stats.replyCount ?? replies.length,
      context: renderNestedQuotes(context),
      thread: thread.map((post) => post.body).filter(Boolean).join("\n\n"),
      replies: renderNestedQuotes(replies),
    };
  }

  private collectPosts(doc: Document): Post[] {
    const cells = this.querySelectorAll(doc, '[data-testid="cellInnerDiv"]');
    const posts: Post[] = [];

    if (cells.length === 0) {
      // Without timeline cells there is no grouping, so treat every post as its own chain.
      this.querySelectorAll(doc, 'article[data-testid="tweet"]').forEach((article, index) => {
        posts.push(this.parsePost(article, index));
      });
      return posts;
    }

    let group = 0;
    for (const cell of cells) {
      const article = cell.querySelector('article[data-testid="tweet"]');
      if (article) {
        posts.push(this.parsePost(article, group));
      } else {
        group++;
      }
    }
    return posts;
  }

  private parsePost(article: Element, group: number): Post {
    const userName = article.querySelector('[data-testid="User-Name"]');
    const name = this.getText(userName?.querySelector("a"));
    const handle = Array.from(userName?.querySelectorAll("span") ?? [])
      .map((span) => this.getText(span))
      .find((text) => /^@\w+$/.test(text)) || "";

    const time = article.querySelector("time[datetime]");
    const permalink = (time?.closest('a[href*="/status/"]') as HTMLAnchorElement | null)?.href || "";
    const date = this.parseDate(this.getAttribute(time, "datetime"));

    return {
      name,
      handle,
      permalink,
      date: date ? date.toISOString().split("T")[0] : "",
      body: this.extractBody(article),
      group,
      article,
    };
  }

  private extractBody(article: Element): string {
    const parts: string[] = [];

    // The first tweetText is the post itself; later ones belong to quoted posts.
    const text = article.querySelector('[data-testid="tweetText"]');
    if (text) {
      const clone = text.cloneNode(true) as Element;
      clone.querySelectorAll("img[alt]").forEach((emoji) => {
        emoji.replaceWith(emoji.ownerDocument.createTextNode(emoji.getAttribute("alt") || ""));
      });
      parts.push(cleanMarkdown(htmlToMarkdown(clone.innerHTML)));
    }

    article.querySelectorAll('[data-testid="tweetPhoto"] img').forEach((img) => {
      const src = this.getAttribute(img, "src");
      if (src) parts.push(`![](${src})`);
    });

    return parts.join("\n\n");
  }

  private toQuote(post: Post): Omit<QuoteEntry, "depth"> {
    const who = [post.name && `**${post.name}**`, post.handle].filter(Boolean).join(" ");
    const header = post.permalink
      ? `${who} · [${post.date || "link"}](${post.permalink})`
      : who;
    return { header, body: post.body };
  }

  private parseStats(article: Element | undefined): Record<string, number | undefined> {
    // e.g. "12 replies, 34 reposts, 567 likes, 8 bookmarks, 9012 views"
    const label = this.getAttribute(article?.querySelector('[role="group"][aria-label]'), "aria-label");
    const read = (noun: string) => {
      const match = label.match(new RegExp(`([\\d,]+) ${noun}`, "i"));
      return match ? parseInt(match[1].replace(/,/g, ""), 10) : undefined;
    };
    return {
      replyCount: read("repl(?:y|ies)"),
      likes: read("likes?"),
      reposts: read("reposts?"),
      views: read("views?"),
    };
  }
}

export const xThreadTemplate = new XThreadTemplate();
