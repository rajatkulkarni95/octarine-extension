/**
 * Template Registry
 * Exports all built-in templates
 */

import type { Template } from '../../types/template';
import { getTemplateManager } from '../template-manager';

// Import templates
import { githubPRTemplate } from './github-pr';
import { githubIssuesTemplate } from './github-issues';
// import { linearIssuesTemplate } from './linear-issues';
// import { twitterThreadTemplate } from './twitter-thread';
// import { redditThreadTemplate } from './reddit-thread';

/**
 * All built-in templates
 * Add new templates to this array as they are created
 */
export const builtInTemplates: Template[] = [
  githubPRTemplate,
  githubIssuesTemplate,
  // linearIssuesTemplate,
  // twitterThreadTemplate,
  // redditThreadTemplate,
];

/**
 * Initialize template system
 * Registers all built-in templates with the manager
 */
export function initializeTemplates(): void {
  const manager = getTemplateManager();
  manager.registerTemplates(builtInTemplates);
}

/**
 * Get template manager instance (re-export for convenience)
 */
export { getTemplateManager };
