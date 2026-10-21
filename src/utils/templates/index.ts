/**
 * Template Registry
 * Exports all built-in templates
 */

import type { Template } from '../../types/template';
import { getTemplateManager } from '../template-manager';

// Import templates
import { githubPRTemplate } from './github-pr';
import { githubIssuesTemplate } from './github-issues';
import { hackerNewsTemplate } from './hackernews';
import { xThreadTemplate } from './x-thread';
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
 * Optional templates are shipped but never auto-detected. They power the
 * gallery templates in /templates, which users import from Settings.
 */
export const optionalTemplates: Template[] = [
  hackerNewsTemplate,
  xThreadTemplate,
];

/**
 * Initialize template system
 * Registers all built-in and optional templates with the manager
 */
export function initializeTemplates(): void {
  const manager = getTemplateManager();
  manager.registerTemplates(builtInTemplates);
  manager.registerTemplates(optionalTemplates);
}

/**
 * Get template manager instance (re-export for convenience)
 */
export { getTemplateManager };
