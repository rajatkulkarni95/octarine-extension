import { BaseTemplate } from "./base-template";
import type { PropertyDefinition } from "../../types/template";
import { PropertyType, TemplateExtractionError } from "../../types/template";
import { htmlToMarkdown, cleanMarkdown } from "../markdown-converter";
import { renderNestedQuotes, type QuoteEntry } from "./nested-quotes";

type PostStats = Record<"replyCount" | "likes" | "reposts" | "views", number | undefined>;

interface Post {
  name: string;
  handle: string;
  permalink: string;
  date: string;
  body: string;
  stats: PostStats;
  /** Vertical offset X positions the post's cell at, used to order posts */
  y: number;
  /** Order the post was first seen in, used when no offset is available */
  seen: number;
  /** Whether a non-post cell precedes the post, which starts a new reply chain */
  startsChain?: boolean;
}

const COLLECT_DELAY_MS = 300;

/**
 * X (Twitter) Thread Template
 * Extracts a post, the author's own thread continuation, and replies as
 * nested blockquotes.
 *
 * X only keeps posts near the viewport in the DOM, so posts are remembered as
 * the user scrolls (see `watch`) and extraction uses everything seen so far.
 */
class XThreadTemplate extends BaseTemplate {
  id = "x-thread";
  name = "X Thread";
  description = "Extract an X post and thread with replies as nested quotes";
  urlPatterns = [/(?:x|twitter)\.com\/[^/]+\/status\/\d+/];
  priority = 10;
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

  private seenDoc: Document | null = null;
  private seenStatusId = "";
  private seenPosts = new Map<string, Post>();
  /** Offset of the "Discover more" style section that ends the conversation */
  private conversationEnd = Infinity;

  extract(doc: Document): Record<string, unknown> {
    const url = this.getUrl(doc);
    const statusId = this.getStatusId(url);
    this.collect(doc);
    const posts = this.orderedPosts();

    const focalPattern = new RegExp(`/status/${statusId}(?:[/?#]|$)`);
    const focalIndex = posts.findIndex((post) => focalPattern.test(post.permalink));
    if (focalIndex === -1) {
      throw new TemplateExtractionError(
        "The main post isn't loaded. Scroll back to the top of the post, then clip again.",
      );
    }
    const focal = posts[focalIndex];

    // The author's consecutive self-replies continue the thread.
    let threadEnd = focalIndex + 1;
    while (threadEnd < posts.length && posts[threadEnd].handle === focal.handle) {
      threadEnd++;
    }
    const thread = posts.slice(focalIndex, threadEnd);

    const context: QuoteEntry[] = posts.slice(0, focalIndex)
      .map((post, index) => ({ depth: index, ...this.toQuote(post) }));

    // X separates reply chains with non-post cells, so a post's position in
    // its chain is its depth.
    const replies: QuoteEntry[] = [];
    let depth = 0;
    posts.slice(threadEnd).forEach((post, index) => {
      depth = index === 0 || post.startsChain !== false ? 0 : depth + 1;
      replies.push({ depth, ...this.toQuote(post) });
    });

    return {
      title: doc.title.replace(/ \/ (X|Twitter)$/, "").trim() || `${focal.name} on X`,
      url,
      statusId,
      author: focal.name,
      handle: focal.handle,
      published: focal.date || undefined,
      ...focal.stats,
      replyCount: focal.stats.replyCount ?? replies.length,
      context: renderNestedQuotes(context),
      thread: thread.map((post) => post.body).filter(Boolean).join("\n\n"),
      replies: renderNestedQuotes(replies),
    };
  }

  /**
   * Remember posts while the user scrolls so ones X has already removed from
   * the DOM still make it into the clip. Returns a function that stops watching.
   */
  watch(doc: Document): () => void {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const collectIfThread = () => {
      timer = undefined;
      if (this.getStatusId(this.getUrl(doc))) this.collect(doc);
    };
    const observer = new MutationObserver(() => {
      timer ??= setTimeout(collectIfThread, COLLECT_DELAY_MS);
    });
    observer.observe(doc.body, { childList: true, subtree: true });
    collectIfThread();
    return () => {
      observer.disconnect();
      if (timer) clearTimeout(timer);
    };
  }

  private getStatusId(url: string): string {
    return url.match(/\/status\/(\d+)/)?.[1] || "";
  }

  /** Record the posts currently in the DOM, keeping ones seen earlier. */
  private collect(doc: Document): void {
    const statusId = this.getStatusId(this.getUrl(doc));
    if (doc !== this.seenDoc || statusId !== this.seenStatusId) {
      this.seenDoc = doc;
      this.seenStatusId = statusId;
      this.seenPosts.clear();
      this.conversationEnd = Infinity;
    }

    const cells = this.querySelectorAll(doc, '[data-testid="cellInnerDiv"]');
    if (cells.length === 0) {
      // Without timeline cells there is no grouping, so treat every post as its own chain.
      this.querySelectorAll(doc, 'article[data-testid="tweet"]').forEach((article) => {
        this.remember(this.parsePost(article, NaN, true));
      });
      return;
    }

    let previousIsPost: boolean | undefined;
    let ended = false;
    for (const cell of cells) {
      const y = this.getOffset(cell);
      const article = cell.querySelector('article[data-testid="tweet"]');
      if (article) {
        const afterEnd = Number.isFinite(y) ? y > this.conversationEnd : ended;
        if (!afterEnd) {
          // The first mounted cell's predecessor is unknown once X has scrolled it away.
          const startsChain = previousIsPost === undefined ? undefined : !previousIsPost;
          this.remember(this.parsePost(article, y, startsChain));
        }
        previousIsPost = true;
      } else {
        // A section heading after the posts, such as "Discover more", ends the conversation.
        if (previousIsPost !== undefined && cell.querySelector("h2")) {
          ended = true;
          if (Number.isFinite(y)) this.conversationEnd = Math.min(this.conversationEnd, y);
        }
        previousIsPost = false;
      }
    }
  }

  private remember(post: Post): void {
    const key = post.permalink || `${post.handle}:${post.body}`;
    const existing = this.seenPosts.get(key);
    this.seenPosts.set(key, {
      ...post,
      y: Number.isFinite(post.y) ? post.y : existing?.y ?? NaN,
      seen: existing?.seen ?? this.seenPosts.size,
      startsChain: post.startsChain ?? existing?.startsChain,
    });
  }

  private orderedPosts(): Post[] {
    return Array.from(this.seenPosts.values())
      .filter((post) => !(post.y > this.conversationEnd))
      .sort((a, b) =>
        Number.isFinite(a.y) && Number.isFinite(b.y) ? a.y - b.y : a.seen - b.seen
      );
  }

  private getOffset(cell: Element): number {
    // X absolutely positions each cell with transform: translateY(<offset>px).
    const transform = (cell as HTMLElement).style?.transform || "";
    const match = transform.match(/translateY\((-?[\d.]+)px\)/);
    return match ? parseFloat(match[1]) : NaN;
  }

  private parsePost(article: Element, y: number, startsChain: boolean | undefined): Post {
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
      stats: this.parseStats(article),
      y,
      seen: 0,
      startsChain,
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

  private parseStats(article: Element): PostStats {
    // e.g. "12 replies, 34 reposts, 567 likes, 8 bookmarks, 9012 views"
    const label = this.getAttribute(article.querySelector('[role="group"][aria-label]'), "aria-label");
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
