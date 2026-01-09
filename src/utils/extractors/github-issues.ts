import type { PageData } from '../../types';

/**
 * Extract GitHub issues from an issues page
 * Supports pagination via ?page=N query parameter
 */
export function extractGitHubIssues(doc: Document): PageData | null {
  const url = doc.location?.href || '';

  // Check if we're on a GitHub issues page
  const isIssuesPage = /github\.com\/[^/]+\/[^/]+\/issues\/?(\?.*)?$/.test(url);
  if (!isIssuesPage) return null;

  const issues: string[] = [];
  const seenUrls = new Set<string>();

  // Find all links that point to individual issues
  const allLinks = doc.querySelectorAll('a[href*="/issues/"]');

  allLinks.forEach((link) => {
    const anchor = link as HTMLAnchorElement;
    const href = anchor.href;

    // Only process links that point to a specific issue number (not the issues list page)
    // and don't have fragment identifiers (like #issuecomment)
    if (/\/issues\/\d+$/.test(href) && !seenUrls.has(href)) {
      // Get the text content, cleaning up whitespace
      let title = anchor.textContent?.trim() || '';

      // Skip if the link is just the issue number (like "#209")
      if (title && !title.match(/^#\d+$/)) {
        seenUrls.add(href);
        issues.push(`- [${title}](${href})`);
      }
    }
  });

  if (issues.length === 0) return null;

  const markdown = issues.join('\n');

  // Extract repo name from URL
  const repoMatch = url.match(/github\.com\/([^/]+\/[^/]+)/);
  const repoName = repoMatch ? repoMatch[1] : 'GitHub Issues';

  // Extract page number from URL query params
  const urlObj = new URL(url);
  const pageParam = urlObj.searchParams.get('page');
  const pageNumber = pageParam ? parseInt(pageParam, 10) : 1;

  return {
    title: `${repoName} Issues Page ${pageNumber}`,
    url,
    content: `<ul>${issues.map(i => `<li>${i}</li>`).join('')}</ul>`,
    markdown,
  };
}
