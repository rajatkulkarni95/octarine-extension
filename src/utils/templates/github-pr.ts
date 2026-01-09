import { BaseTemplate } from './base-template';
import type { PropertyDefinition } from '../../types/template';
import { PropertyType } from '../../types/template';

/**
 * GitHub Pull Request Template
 * Extracts PR details including status, reviewers, and file changes
 */
class GitHubPRTemplate extends BaseTemplate {
  id = 'github-pr';
  name = 'GitHub Pull Request';
  description = 'Extract PR details with status, reviewers, and file changes';
  urlPatterns = [/github\.com\/[^/]+\/[^/]+\/pull\/\d+/];
  priority = 10;
  defaultFolder = 'Engineering/PRs';
  defaultFilename = '{repo}-pr-{prNumber}';
  version = '1.0.0';

  properties: PropertyDefinition[] = [
    {
      key: 'prNumber',
      displayName: 'PR Number',
      type: PropertyType.String,
      required: true,
      enabled: true,
    },
    {
      key: 'repo',
      displayName: 'Repository',
      type: PropertyType.String,
      required: true,
      enabled: true,
    },
    {
      key: 'status',
      displayName: 'Status',
      type: PropertyType.String,
      required: true,
      enabled: true,
    },
    {
      key: 'author',
      displayName: 'Author',
      type: PropertyType.String,
      required: false,
      enabled: true,
    },
    {
      key: 'reviewers',
      displayName: 'Reviewers',
      type: PropertyType.Array,
      required: false,
      enabled: true,
    },
    {
      key: 'filesChanged',
      displayName: 'Files Changed',
      type: PropertyType.Number,
      required: false,
      enabled: true,
    },
    {
      key: 'linesAdded',
      displayName: 'Lines Added',
      type: PropertyType.Number,
      required: false,
      enabled: false,
    },
    {
      key: 'linesRemoved',
      displayName: 'Lines Removed',
      type: PropertyType.Number,
      required: false,
      enabled: false,
    },
    {
      key: 'mergedDate',
      displayName: 'Merged Date',
      type: PropertyType.Date,
      required: false,
      enabled: true,
    },
  ];

  contentTemplate = `# [PR #{prNumber}] {title}

**Status**: {status:emoji} {status:text}{if:mergedDate} on {mergedDate:format:MMM D, YYYY}{/if}
{if:author}**Author**: @{author}{/if}
{if:reviewers}**Reviewers**: {reviewers:join:, }{/if}

{if:description}## Description

{description}
{/if}
{if:filesChanged}## Changes

- {filesChanged} file{filesChanged:plural:s} changed
{if:linesAdded}- +{linesAdded} line{linesAdded:plural:s} added{/if}
{if:linesRemoved}- -{linesRemoved} line{linesRemoved:plural:s} removed{/if}
{/if}

## Link

{url}`;

  extract(doc: Document): Record<string, any> {
    const url = this.getUrl(doc);

    // Extract PR number from URL
    const prMatch = url.match(/\/pull\/(\d+)/);
    const prNumber = prMatch ? prMatch[1] : '';

    // Extract repo name from URL
    const repoMatch = url.match(/github\.com\/([^/]+\/[^/]+)/);
    const repo = repoMatch ? repoMatch[1] : 'GitHub';

    // Extract title
    const titleElement = this.querySelector(
      doc,
      '.js-issue-title',
      'h1.gh-header-title bdi',
      '[data-testid="issue-viewer-title"]'
    );
    const prTitle = this.getText(titleElement) || 'Untitled PR';

    // Extract status (open, merged, closed)
    let status = 'open';
    let mergedDate: Date | null = null;

    const mergedBadge = this.querySelector(doc, '.State--merged', '[title*="Status: Merged"]');
    const closedBadge = this.querySelector(doc, '.State--closed', '[title*="Status: Closed"]');

    if (mergedBadge) {
      status = 'merged';
      // Try to find merge date
      const mergedText = this.querySelector(
        doc,
        '.TimelineItem-body:has(.State--merged)',
        '.gh-header-meta relative-time'
      );
      if (mergedText) {
        const dateElement = mergedText.querySelector('relative-time');
        const dateStr = this.getAttribute(dateElement, 'datetime') || this.getText(dateElement);
        mergedDate = this.parseDate(dateStr);
      }
    } else if (closedBadge) {
      status = 'closed';
    }

    // Extract author
    const authorElement = this.querySelector(doc, '.author', '[rel="author"]', '.TimelineItem-body a.author');
    const author = this.getText(authorElement);

    // Extract reviewers
    const reviewers: string[] = [];
    const reviewerElements = this.querySelectorAll(
      doc,
      '[aria-label*="reviewed"], .reviewer a, .js-issue-sidebar-form .reviewer'
    );
    reviewerElements.forEach((reviewer) => {
      const name = this.getText(reviewer) || reviewer.getAttribute('aria-label')?.match(/@[\w-]+/)?.[0];
      if (name && !reviewers.includes(name)) {
        // Remove @ prefix if present
        reviewers.push(name.startsWith('@') ? name.substring(1) : name);
      }
    });

    // Extract description (first comment body)
    const descriptionElement = this.querySelector(
      doc,
      '.comment-body:first-of-type',
      '.markdown-body:first-of-type',
      '[data-testid="issue-viewer-body"]'
    );
    let description = this.getText(descriptionElement);
    // Limit to reasonable length
    if (description.length > 1000) {
      description = description.substring(0, 1000) + '...';
    }

    // Extract file changes stats
    let filesChanged = 0;
    let linesAdded = 0;
    let linesRemoved = 0;

    // Try to find the diff stat
    const diffStat = this.querySelector(doc, '.diffbar', '[data-testid="pr-diffbar"]');
    if (diffStat) {
      const fileText = this.getText(diffStat);
      const fileMatch = fileText.match(/(\d+)\s+files?\s+changed/i);
      if (fileMatch) {
        filesChanged = parseInt(fileMatch[1], 10);
      }

      // Look for additions/deletions
      const additionsMatch = fileText.match(/(\d+)\s+additions?/i) || fileText.match(/\+(\d+)/);
      const deletionsMatch = fileText.match(/(\d+)\s+deletions?/i) || fileText.match(/-(\d+)/);

      if (additionsMatch) linesAdded = parseInt(additionsMatch[1], 10);
      if (deletionsMatch) linesRemoved = parseInt(deletionsMatch[1], 10);
    }

    // Alternative: look for diffstat in the header
    if (filesChanged === 0) {
      const diffStatAlt = this.querySelector(doc, '#files_bucket .diffstat', '.file-info');
      if (diffStatAlt) {
        const statText = this.getText(diffStatAlt);
        const fileMatch = statText.match(/(\d+)\s+changed\s+files?/);
        if (fileMatch) filesChanged = parseInt(fileMatch[1], 10);
      }
    }

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
