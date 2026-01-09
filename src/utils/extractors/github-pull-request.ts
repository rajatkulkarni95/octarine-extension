import type { PageData } from '../../types';

/**
 * Extract GitHub Pull Request details from a PR page
 * Extracts title, status, description, author, reviewers, and file changes
 */
export function extractGitHubPullRequest(doc: Document): PageData | null {
  const url = doc.location?.href || '';

  // Check if we're on a GitHub PR page
  const isPRPage = /github\.com\/[^/]+\/[^/]+\/pull\/\d+/.test(url);
  if (!isPRPage) return null;

  // Extract PR number from URL
  const prMatch = url.match(/\/pull\/(\d+)/);
  const prNumber = prMatch ? prMatch[1] : '';

  // Extract title
  const titleElement = doc.querySelector('.js-issue-title, h1.gh-header-title bdi, [data-testid="issue-viewer-title"]');
  const title = titleElement?.textContent?.trim() || 'Untitled PR';

  // Extract status (open, merged, closed)
  let status = 'Open';
  let statusEmoji = '🟢';
  let statusDate = '';

  const mergedBadge = doc.querySelector('.State--merged, [title*="Status: Merged"]');
  const closedBadge = doc.querySelector('.State--closed, [title*="Status: Closed"]');

  if (mergedBadge) {
    status = 'Merged';
    statusEmoji = '✅';
    // Try to find merge date
    const mergedText = doc.querySelector('.TimelineItem-body:has(.State--merged), .gh-header-meta relative-time');
    if (mergedText) {
      const dateElement = mergedText.querySelector('relative-time');
      statusDate = dateElement?.getAttribute('datetime') || dateElement?.textContent?.trim() || '';
      if (statusDate) {
        try {
          statusDate = ` on ${new Date(statusDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
        } catch {
          statusDate = '';
        }
      }
    }
  } else if (closedBadge) {
    status = 'Closed';
    statusEmoji = '❌';
  }

  // Extract author
  const authorElement = doc.querySelector('.author, [rel="author"], .TimelineItem-body a.author');
  const author = authorElement?.textContent?.trim() || '';

  // Extract reviewers
  const reviewers: string[] = [];
  const reviewerElements = doc.querySelectorAll('[aria-label*="reviewed"], .reviewer a, .js-issue-sidebar-form .reviewer');
  reviewerElements.forEach((reviewer) => {
    const name = reviewer.textContent?.trim() || reviewer.getAttribute('aria-label')?.match(/@[\w-]+/)?.[0];
    if (name && !reviewers.includes(name)) {
      reviewers.push(name);
    }
  });

  // Extract description (first comment body)
  const descriptionElement = doc.querySelector('.comment-body:first-of-type, .markdown-body:first-of-type, [data-testid="issue-viewer-body"]');
  let description = '';
  if (descriptionElement) {
    // Get text content, preserving basic structure
    description = descriptionElement.textContent?.trim() || '';
    // Limit to reasonable length
    if (description.length > 1000) {
      description = description.substring(0, 1000) + '...';
    }
  }

  // Extract file changes stats
  let filesChanged = 0;
  let linesAdded = 0;
  let linesRemoved = 0;

  // Try to find the diff stat
  const diffStat = doc.querySelector('.diffbar, [data-testid="pr-diffbar"]');
  if (diffStat) {
    // Look for file count
    const fileText = diffStat.textContent || '';
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
    const diffStatAlt = doc.querySelector('#files_bucket .diffstat, .file-info');
    if (diffStatAlt) {
      const statText = diffStatAlt.textContent || '';
      const fileMatch = statText.match(/(\d+)\s+changed\s+files?/);
      if (fileMatch) filesChanged = parseInt(fileMatch[1], 10);
    }
  }

  // Build markdown content
  const parts: string[] = [];

  parts.push(`# [PR #${prNumber}] ${title}`);
  parts.push('');
  parts.push(`**Status**: ${statusEmoji} ${status}${statusDate}`);

  if (author) {
    parts.push(`**Author**: @${author}`);
  }

  if (reviewers.length > 0) {
    parts.push(`**Reviewers**: ${reviewers.map(r => `@${r}`).join(', ')}`);
  }

  parts.push('');

  if (description) {
    parts.push('## Description');
    parts.push('');
    parts.push(description);
    parts.push('');
  }

  // Add changes summary
  if (filesChanged > 0 || linesAdded > 0 || linesRemoved > 0) {
    parts.push('## Changes');
    parts.push('');
    if (filesChanged > 0) {
      parts.push(`- ${filesChanged} file${filesChanged !== 1 ? 's' : ''} changed`);
    }
    if (linesAdded > 0) {
      parts.push(`- +${linesAdded} line${linesAdded !== 1 ? 's' : ''} added`);
    }
    if (linesRemoved > 0) {
      parts.push(`- -${linesRemoved} line${linesRemoved !== 1 ? 's' : ''} removed`);
    }
    parts.push('');
  }

  parts.push('## Link');
  parts.push('');
  parts.push(url);

  const markdown = parts.join('\n');

  // Extract repo name for title
  const repoMatch = url.match(/github\.com\/([^/]+\/[^/]+)/);
  const repoName = repoMatch ? repoMatch[1] : 'GitHub';

  return {
    title: `${repoName} PR #${prNumber}`,
    url,
    content: `<div>${markdown}</div>`,
    markdown,
  };
}
