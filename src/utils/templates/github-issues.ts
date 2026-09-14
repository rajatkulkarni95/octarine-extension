import { BaseTemplate } from "./base-template";
import type { PropertyDefinition } from "../../types/template";
import { PropertyType } from "../../types/template";

/**
 * GitHub Issues Template
 * Extracts list of issues from a GitHub issues page
 */
class GitHubIssuesTemplate extends BaseTemplate {
  id = "github-issues";
  name = "GitHub Issues List";
  description = "Extract list of issues from GitHub issues page";
  urlPatterns = [/github\.com\/[^/]+\/[^/]+\/issues\/?(\?.*)?$/];
  priority = 10;
  defaultFolder = "Engineering/Issues";
  defaultFilename = "{repo}-issues-page-{pageNumber}";
  version = "1.0.0";

  properties: PropertyDefinition[] = [
    {
      key: "repo",
      displayName: "Repository",
      type: PropertyType.String,
      required: true,
      enabled: true,
    },
    {
      key: "pageNumber",
      displayName: "Page Number",
      type: PropertyType.Number,
      required: true,
      enabled: true,
    },
    {
      key: "issueCount",
      displayName: "Issue Count",
      type: PropertyType.Number,
      required: false,
      enabled: true,
    },
  ];

  contentTemplate = `
{each:issues}
{value}
{/each}`;

  extract(doc: Document): Record<string, unknown> {
    const url = this.getUrl(doc);

    const seenUrls = new Set<string>();
    const issues: string[] = [];

    // Find all links that point to individual issues
    const allLinks = this.querySelectorAll(doc, 'a[href*="/issues/"]');

    allLinks.forEach((link) => {
      const anchor = link as HTMLAnchorElement;
      const href = anchor.href;

      // Only process links that point to a specific issue number (not the issues list page)
      // and don't have fragment identifiers (like #issuecomment)
      if (/\/issues\/\d+$/.test(href) && !seenUrls.has(href)) {
        // Get the text content, cleaning up whitespace
        const title = this.getText(link);

        // Skip if the link is just the issue number (like "#209")
        if (title && !title.match(/^#\d+$/)) {
          seenUrls.add(href);
          issues.push(`- [${title}](${href})`);
        }
      }
    });

    // Extract repo name from URL
    const repoMatch = url.match(/github\.com\/([^/]+\/[^/]+)/);
    const repo = repoMatch ? repoMatch[1] : "GitHub";

    // Extract page number from URL query params
    const urlObj = new URL(url);
    const pageParam = urlObj.searchParams.get("page");
    const pageNumber = pageParam ? parseInt(pageParam, 10) : 1;

    return {
      title: `${repo} Issues Page ${pageNumber}`,
      repo,
      pageNumber,
      issueCount: issues.length,
      issues,
      url,
    };
  }
}

// Export singleton instance
export const githubIssuesTemplate = new GitHubIssuesTemplate();
