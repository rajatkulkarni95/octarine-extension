import { BaseTemplate } from "./base-template";
import type { PropertyDefinition } from "../../types/template";
import { PropertyType } from "../../types/template";
import { htmlToMarkdown, cleanMarkdown } from "../markdown-converter";

/**
 * GitHub Pull Request Template
 * Extracts PR details including status, reviewers, and file changes
 */
class GitHubPRTemplate extends BaseTemplate {
  id = "github-pr";
  name = "GitHub Pull Request";
  description = "Extract PR details with status, reviewers, and file changes";
  urlPatterns = [/github\.com\/[^/]+\/[^/]+\/pull\/\d+/];
  priority = 10;
  defaultFolder = "Engineering/PRs";
  defaultFilename = "{repo}-pr-{prNumber}";
  version = "1.0.0";

  properties: PropertyDefinition[] = [
    {
      key: "prNumber",
      displayName: "PR Number",
      type: PropertyType.String,
      required: true,
      enabled: true,
    },
    {
      key: "repo",
      displayName: "Repository",
      type: PropertyType.String,
      required: true,
      enabled: true,
    },
    {
      key: "status",
      displayName: "Status",
      type: PropertyType.String,
      required: true,
      enabled: true,
    },
    {
      key: "author",
      displayName: "Author",
      type: PropertyType.String,
      required: false,
      enabled: true,
    },
    {
      key: "reviewers",
      displayName: "Reviewers",
      type: PropertyType.Array,
      required: false,
      enabled: true,
    },
    {
      key: "filesChanged",
      displayName: "Files Changed",
      type: PropertyType.Number,
      required: false,
      enabled: true,
    },
    {
      key: "linesAdded",
      displayName: "Lines Added",
      type: PropertyType.String,
      required: false,
      enabled: true,
    },
    {
      key: "linesRemoved",
      displayName: "Lines Removed",
      type: PropertyType.String,
      required: false,
      enabled: true,
    },
    {
      key: "mergedDate",
      displayName: "Merged Date",
      type: PropertyType.Date,
      required: false,
      enabled: true,
    },
  ];

  contentTemplate = `
{if:description}
{description}
{/if}
`;

  extract(doc: Document): Record<string, any> {
    const url = this.getUrl(doc);

    // Extract PR number from URL
    const prMatch = url.match(/\/pull\/(\d+)/);
    const prNumber = prMatch ? prMatch[1] : "";

    // Extract repo name from URL
    const repoMatch = url.match(/github\.com\/([^/]+\/[^/]+)/);
    const repo = repoMatch ? repoMatch[1] : "GitHub";

    // Extract title
    const titleElement = this.querySelector(
      doc,
      ".js-issue-title",
      "h1.gh-header-title bdi",
      '[data-testid="issue-viewer-title"]',
    );
    const prTitle = this.getText(titleElement) || "Untitled PR";

    // Extract status (open, merged, closed)
    let status = "open";
    let mergedDate: Date | null = null;

    const mergedBadge = this.querySelector(
      doc,
      ".State--merged",
      '[title*="Status: Merged"]',
    );
    const closedBadge = this.querySelector(
      doc,
      ".State--closed",
      '[title*="Status: Closed"]',
    );

    if (mergedBadge) {
      status = "merged";
      // Try to find merge date
      const mergedText = this.querySelector(
        doc,
        ".TimelineItem-body:has(.State--merged)",
        ".gh-header-meta relative-time",
      );
      if (mergedText) {
        const dateElement = mergedText.querySelector("relative-time");
        const dateStr =
          this.getAttribute(dateElement, "datetime") ||
          this.getText(dateElement);
        mergedDate = this.parseDate(dateStr);
      }
    } else if (closedBadge) {
      status = "closed";
    }

    // Extract author
    const authorElement = this.querySelector(
      doc,
      ".author",
      '[rel="author"]',
      ".TimelineItem-body a.author",
    );
    const author = this.getText(authorElement);

    // Extract reviewers
    const reviewers: string[] = [];
    const reviewerElements = this.querySelectorAll(
      doc,
      '[aria-label*="reviewed"], .reviewer a, .js-issue-sidebar-form .reviewer',
    );
    reviewerElements.forEach((reviewer) => {
      const name =
        this.getText(reviewer) ||
        reviewer.getAttribute("aria-label")?.match(/@[\w-]+/)?.[0];
      if (name && !reviewers.includes(name)) {
        // Remove @ prefix if present
        reviewers.push(name.startsWith("@") ? name.substring(1) : name);
      }
    });

    // Extract description (first comment body)
    const descriptionElement = this.querySelector(
      doc,
      ".comment-body:first-of-type",
      ".markdown-body:first-of-type",
      '[data-testid="issue-viewer-body"]',
    );

    // Extract as markdown to preserve formatting
    let description = '';
    if (descriptionElement) {
      // GitHub renders markdown as HTML, so we get the innerHTML
      const htmlContent = descriptionElement.innerHTML || '';

      // Convert HTML to markdown
      description = cleanMarkdown(htmlToMarkdown(htmlContent));
    }

    // Limit to reasonable length
    if (description.length > 2000) {
      description = description.substring(0, 2000) + "...";
    }

    // Extract file changes stats
    let filesChanged = 0;
    let linesAdded = "";
    let linesRemoved = "";

    // Try multiple selectors for file changes (GitHub UI changes frequently)
    const possibleSelectors = [
      "#files_tab_counter", // Tab counter badge
      '[data-tab-item="files"] .Counter', // Files tab counter
      ".diffbar-item", // Diffbar items
      '[data-testid="pr-diffbar"]',
      ".diffbar",
    ];

    // Look for the "Files changed" tab counter first (most reliable)
    for (const selector of possibleSelectors) {
      const element = this.querySelector(doc, selector);
      if (element) {
        const text = this.getText(element);
        console.log(
          "[GitHub PR Template] Checking selector:",
          selector,
          "Text:",
          text,
        );

        // Try to extract number from counter badge
        const numberMatch = text.match(/^(\d+)$/);
        if (numberMatch) {
          filesChanged = parseInt(numberMatch[1], 10);
          console.log(
            "[GitHub PR Template] Found files changed:",
            filesChanged,
          );
          break;
        }

        // Try to extract from "X files changed" text
        const fileMatch = text.match(/(\d+)\s+files?\s+changed/i);
        if (fileMatch) {
          filesChanged = parseInt(fileMatch[1], 10);
          console.log(
            "[GitHub PR Template] Found files changed:",
            filesChanged,
          );
          break;
        }
      }
    }

    // Look for additions/deletions - GitHub shows this in multiple places
    // First try: Look in the PR header/summary area
    const summaryElement = this.querySelector(
      doc,
      '.gh-header-meta',
      '.diffstat-summary',
      '[data-testid="pr-summary"]'
    );

    if (summaryElement) {
      const summaryText = this.getText(summaryElement);
      console.log("[GitHub PR Template] Summary text:", summaryText);

      // Extract from text like "+1,477 −89" or "1,477 additions, 89 deletions"
      // Handle comma-separated numbers
      const addMatch = summaryText.match(/\+([\d,]+)/);
      const delMatch = summaryText.match(/[−–-]([\d,]+)/);

      if (addMatch) {
        const additions = addMatch[1].replace(/,/g, ''); // Remove commas
        linesAdded = `+${additions}`;
        console.log("[GitHub PR Template] Found additions from summary:", linesAdded);
      }
      if (delMatch) {
        const deletions = delMatch[1].replace(/,/g, ''); // Remove commas
        linesRemoved = `-${deletions}`;
        console.log("[GitHub PR Template] Found deletions from summary:", linesRemoved);
      }
    }

    // Second try: Look in diffstat elements
    if (!linesAdded || !linesRemoved) {
      const diffSelectors = [
        ".diffbar-item",
        '[data-testid="pr-diffbar"] span',
        ".diffstat",
        'a[href="#diff-stat"]',
        '.text-green', // GitHub's green text for additions
        '.text-red', // GitHub's red text for deletions
      ];

      const diffElements: Element[] = [];
      for (const selector of diffSelectors) {
        const elements = this.querySelectorAll(doc, selector);
        diffElements.push(...elements);
      }

      diffElements.forEach((el) => {
        const text = this.getText(el);
        const ariaLabel = el.getAttribute("aria-label") || '';
        const title = el.getAttribute("title") || '';
        const fullText = `${text} ${ariaLabel} ${title}`;

        console.log("[GitHub PR Template] Diff element text:", fullText);

        // Look for additions like "+1,477" or "1,477 additions"
        if (!linesAdded) {
          const addMatch = fullText.match(/\+([\d,]+)/) || fullText.match(/([\d,]+)\s+additions?/i);
          if (addMatch) {
            const additions = addMatch[1].replace(/,/g, ''); // Remove commas
            linesAdded = `+${additions}`;
            console.log("[GitHub PR Template] Found additions:", linesAdded);
          }
        }

        // Look for deletions like "−89", "-89" or "89 deletions"
        if (!linesRemoved) {
          const delMatch = fullText.match(/[−–-]([\d,]+)/) || fullText.match(/([\d,]+)\s+deletions?/i);
          if (delMatch) {
            const deletions = delMatch[1].replace(/,/g, ''); // Remove commas
            linesRemoved = `-${deletions}`;
            console.log("[GitHub PR Template] Found deletions:", linesRemoved);
          }
        }
      });
    }

    console.log("[GitHub PR Template] Final extraction:", {
      filesChanged,
      linesAdded,
      linesRemoved,
    });

    return {
      title: prTitle,
      prNumber,
      repo,
      status,
      author,
      reviewers,
      description,
      filesChanged: filesChanged || undefined,
      linesAdded: linesAdded || undefined,
      linesRemoved: linesRemoved || undefined,
      mergedDate,
      url,
    };
  }
}

// Export singleton instance
export const githubPRTemplate = new GitHubPRTemplate();
