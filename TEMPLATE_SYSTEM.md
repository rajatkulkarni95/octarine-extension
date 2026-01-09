# Template System Design

## Overview

The template system allows for structured extraction and formatting of content from specific websites (GitHub, Linear, Twitter, Reddit, etc.). Each template defines:
- What data to extract
- How to format it as markdown
- Which properties to save
- Where to save files by default

## Core Principles

1. **Built-in Templates Only**: Templates are shipped with the extension. Users cannot create/modify templates (but can override preferences).
2. **Auto-Detection First**: Templates are automatically selected based on URL patterns.
3. **Manual Override Available**: Users can manually select a different template in the popup.
4. **Property Toggles**: Users can enable/disable individual properties per template.
5. **Folder Customization**: Users can override the default save folder.
6. **Pass-through to Octarine**: Extension extracts and structures data; Octarine handles property conflicts and storage.

---

## Core Interfaces

### Template

```typescript
interface Template {
  // Identity
  id: string;                    // Unique identifier (e.g., "github-pr")
  name: string;                  // Display name (e.g., "GitHub Pull Request")
  description: string;           // Short description for users

  // Auto-detection (built-in only, users can't modify)
  urlPatterns: RegExp[];         // URL patterns to match (e.g., [/github\.com\/.*\/pull\/\d+/])
  priority: number;              // For ordering if multiple match (higher = first)

  // Saving defaults
  defaultFolder: string;         // Default save path (e.g., "Engineering/PRs")
  defaultFilename: string;       // Template for filename (e.g., "{repo}-pr-{number}")

  // Properties
  properties: PropertyDefinition[];

  // Template
  contentTemplate: string;       // Markdown template with placeholders

  // Metadata
  version: string;               // Template version for future migrations
  isBuiltIn: boolean;            // Always true for shipped templates
}
```

### PropertyDefinition

```typescript
interface PropertyDefinition {
  key: string;                   // Property key (e.g., "prNumber")
  displayName: string;           // Human-readable name (e.g., "PR Number")
  type: PropertyType;            // Data type
  defaultValue?: any;            // Default if not extracted
  required: boolean;             // Must be present for template to work
  enabled: boolean;              // Default toggle state
}

enum PropertyType {
  String = "string",
  Number = "number",
  Date = "date",
  Array = "array",
  Boolean = "boolean",
  URL = "url"
}
```

### TemplatePreferences

```typescript
// User preferences stored per-template in chrome.storage
interface TemplatePreferences {
  [templateId: string]: {
    folder?: string;             // Override default folder
    propertyToggles: {           // Override enabled/disabled state
      [propertyKey: string]: boolean;
    };
  };
}
```

### ExtractedData

```typescript
interface ExtractedData {
  templateId: string;            // Which template was used
  title: string;                 // Document title
  content: string;               // Rendered markdown content
  properties: Record<string, any>; // Extracted properties (only enabled ones)
  url: string;                   // Source URL
  folder: string;                // Where to save (from template or user override)
  filename?: string;             // Suggested filename
}
```

---

## Behavior Rules

### 1. Property Toggles
- **Toggled ON**: Property is extracted and passed to Octarine
- **Toggled OFF**: Property is completely excluded (not extracted, not in content, not sent to Octarine)
- Toggle states are saved in user preferences per template

### 2. Folder Structure
- Simple flat strings like "Engineering/PRs"
- No validation in the extension
- Octarine handles folder creation and structure

### 3. Template Selection
- **Auto-detect**: Based on URL patterns (first match by priority wins)
- **Manual override**: Dropdown in popup to select different template
- **Warning**: If manual selection doesn't match URL, show warning to user

### 4. Multiple Template Matches
- First matching template is used (based on `priority` field)
- Since templates are built-in only, no conflicts expected

### 5. Property Handling
- Extension extracts properties based on template definition
- Sends properties to Octarine as-is
- Octarine handles conflicts, merging, and property type validation

---

## File Structure

```
src/
├── types/
│   └── template.ts              # Template interfaces
├── utils/
│   ├── templates/
│   │   ├── index.ts             # Template registry
│   │   ├── base-template.ts     # Abstract base class
│   │   ├── github-pr.ts         # GitHub PR template
│   │   ├── github-issues.ts     # GitHub Issues template
│   │   ├── linear-issues.ts     # Linear template
│   │   ├── twitter-thread.ts    # Twitter/X template
│   │   └── reddit-thread.ts     # Reddit template
│   ├── template-manager.ts      # Template selection and rendering logic
│   ├── template-renderer.ts     # Template string rendering engine
│   └── extractor.ts             # Updated to use template-manager
├── popup/
│   └── components/
│       ├── TemplateSelector.tsx # Dropdown component
│       └── PropertyToggles.tsx  # Property enable/disable UI
└── utils/
    └── settings.ts              # Load/save template preferences
```

---

## Template Format

### Content Template Syntax

Templates use a simple placeholder syntax:

```markdown
# {title}

**Status**: {status}
**Author**: @{author}

{if:reviewers}
**Reviewers**: {reviewers:join:, }
{/if}

{content}

{if:filesChanged}
## Changes
- {filesChanged} files changed
{if:linesAdded}- +{linesAdded} lines added{/if}
{if:linesRemoved}- -{linesRemoved} lines removed{/if}
{/if}
```

**Placeholder Types:**
- `{propertyKey}` - Simple value substitution
- `{propertyKey:format}` - Apply formatter (e.g., `{date:YYYY-MM-DD}`)
- `{propertyKey:join:separator}` - Join array with separator
- `{if:propertyKey}...{/if}` - Conditional section (only if property exists and is not empty)
- `{each:propertyKey}...{/each}` - Loop over array (access with `{value}`)

---

## Implementation Phases

### Phase 1: Core System
**Goal**: Set up the template infrastructure

1. Create `types/template.ts` with all interfaces
2. Create `utils/template-renderer.ts` for parsing template syntax
3. Create `utils/template-manager.ts` for template selection logic
4. Create `utils/templates/base-template.ts` abstract class
5. Update `utils/extractor.ts` to use TemplateManager
6. Update settings to store/load template preferences

**Files to create:**
- `src/types/template.ts`
- `src/utils/template-renderer.ts`
- `src/utils/template-manager.ts`
- `src/utils/templates/base-template.ts`
- `src/utils/templates/index.ts`

**Files to modify:**
- `src/utils/extractor.ts`
- `src/utils/settings.ts`
- `src/types/index.ts`

### Phase 2: Convert Existing Extractors
**Goal**: Migrate GitHub extractors to template format

1. Create `github-pr.ts` template (convert existing extractor)
2. Create `github-issues.ts` template (convert existing extractor)
3. Register templates in template registry
4. Remove old extractor files
5. Test on actual GitHub pages

**Files to create:**
- `src/utils/templates/github-pr.ts`
- `src/utils/templates/github-issues.ts`

**Files to remove:**
- `src/utils/extractors/github-pr.ts`
- `src/utils/extractors/github-issues.ts`

### Phase 3: UI Components
**Goal**: Add template selection and property toggles to popup

1. Create `TemplateSelector.tsx` component (dropdown)
2. Create `PropertyToggles.tsx` component (checkboxes)
3. Add folder override input
4. Update popup to show template info
5. Add template settings page
6. Save/load preferences from storage

**Files to create:**
- `src/popup/components/TemplateSelector.tsx`
- `src/popup/components/PropertyToggles.tsx`

**Files to modify:**
- `src/popup/App.tsx`
- `src/utils/settings.ts`

### Phase 4: New Templates
**Goal**: Add remaining templates (one PR per template)

1. **Linear Issues Template**
   - Extract issue details, status, assignee, labels
   - Default folder: "Engineering/Issues"

2. **Twitter/X Threads Template**
   - Extract thread tweets, author, engagement stats
   - Default folder: "Social/Twitter"

3. **Reddit Threads Template**
   - Extract post content, top comments, subreddit
   - Default folder: "Social/Reddit"

---

## Example: GitHub PR Template

```typescript
import { Template, PropertyDefinition, PropertyType } from '../../types/template';

export const githubPRTemplate: Template = {
  id: 'github-pr',
  name: 'GitHub Pull Request',
  description: 'Extract PR details with status, reviewers, and changes',

  urlPatterns: [/github\.com\/[^/]+\/[^/]+\/pull\/\d+/],
  priority: 10,

  defaultFolder: 'Engineering/PRs',
  defaultFilename: '{repo}-pr-{prNumber}',

  properties: [
    {
      key: 'prNumber',
      displayName: 'PR Number',
      type: PropertyType.String,
      required: true,
      enabled: true
    },
    {
      key: 'status',
      displayName: 'Status',
      type: PropertyType.String,
      required: true,
      enabled: true
    },
    {
      key: 'author',
      displayName: 'Author',
      type: PropertyType.String,
      required: false,
      enabled: true
    },
    {
      key: 'reviewers',
      displayName: 'Reviewers',
      type: PropertyType.Array,
      required: false,
      enabled: true
    },
    {
      key: 'filesChanged',
      displayName: 'Files Changed',
      type: PropertyType.Number,
      required: false,
      enabled: true
    },
    {
      key: 'linesAdded',
      displayName: 'Lines Added',
      type: PropertyType.Number,
      required: false,
      enabled: false
    },
    {
      key: 'linesRemoved',
      displayName: 'Lines Removed',
      type: PropertyType.Number,
      required: false,
      enabled: false
    },
    {
      key: 'mergedDate',
      displayName: 'Merged Date',
      type: PropertyType.Date,
      required: false,
      enabled: true
    }
  ],

  contentTemplate: `# [PR #{prNumber}] {title}

**Status**: {status:emoji} {status:text}
{if:author}**Author**: @{author}{/if}
{if:reviewers}**Reviewers**: {reviewers:join:@, @}{/if}
{if:mergedDate}**Merged**: {mergedDate:format:MMM D, YYYY}{/if}

## Description

{description}

{if:filesChanged}
## Changes

- {filesChanged} file{filesChanged:plural:s} changed
{if:linesAdded}- +{linesAdded} line{linesAdded:plural:s} added{/if}
{if:linesRemoved}- -{linesRemoved} line{linesRemoved:plural:s} removed{/if}
{/if}

## Link

{url}`,

  version: '1.0.0',
  isBuiltIn: true,

  // Extraction function
  extract(doc: Document): Record<string, any> {
    // ... extraction logic here (moved from github-pull-request.ts)
  }
};
```

---

## Template Manager Logic

```typescript
class TemplateManager {
  private templates: Map<string, Template>;
  private preferences: TemplatePreferences;

  // Select template based on URL
  selectTemplate(url: string): Template | null {
    const matches = Array.from(this.templates.values())
      .filter(t => t.urlPatterns.some(pattern => pattern.test(url)))
      .sort((a, b) => b.priority - a.priority);

    return matches[0] || null;
  }

  // Extract data using template
  async extractData(doc: Document, templateId?: string): Promise<ExtractedData> {
    const template = templateId
      ? this.templates.get(templateId)
      : this.selectTemplate(doc.location.href);

    if (!template) return null;

    // Get user preferences for this template
    const prefs = this.preferences[template.id] || {};

    // Extract raw data
    const rawData = template.extract(doc);

    // Filter properties based on toggles
    const enabledProps = template.properties
      .filter(prop => prefs.propertyToggles?.[prop.key] ?? prop.enabled);

    const properties: Record<string, any> = {};
    enabledProps.forEach(prop => {
      if (rawData[prop.key] !== undefined) {
        properties[prop.key] = rawData[prop.key];
      }
    });

    // Render content template
    const content = this.renderTemplate(template.contentTemplate, rawData);

    // Determine folder (user override or default)
    const folder = prefs.folder || template.defaultFolder;

    return {
      templateId: template.id,
      title: rawData.title,
      content,
      properties,
      url: doc.location.href,
      folder,
      filename: this.renderTemplate(template.defaultFilename, rawData)
    };
  }

  private renderTemplate(template: string, data: Record<string, any>): string {
    // Template rendering logic (placeholders, conditionals, loops)
    // ... implementation in template-renderer.ts
  }
}
```

---

## User Experience Flow

1. **User visits GitHub PR page**
2. **Opens extension popup**
3. **Template auto-detected**: "GitHub Pull Request" shown in dropdown
4. **Preview shown**: Rendered markdown with all enabled properties
5. **User can**:
   - Toggle properties on/off
   - Change save folder
   - Select different template (with warning if URL doesn't match)
6. **Clicks "Send to Octarine"**
7. **Extension sends**:
   - Rendered markdown content
   - Enabled properties as structured data
   - Folder path
   - Suggested filename

---

## Testing Strategy

1. **Unit Tests**:
   - Template renderer (placeholders, conditionals, formatters)
   - Template manager (selection, extraction, filtering)
   - Each template's extraction logic

2. **Integration Tests**:
   - Load real HTML from GitHub/Linear/etc.
   - Verify extracted data matches expected structure
   - Test property toggles
   - Test preference saving/loading

3. **Manual Testing**:
   - Test on actual websites
   - Verify markdown renders correctly in Octarine
   - Test template switching
   - Test property toggles in real-time

---

## Future Enhancements

1. **Template Versioning**: Handle template updates gracefully
2. **Custom Templates**: Allow advanced users to create their own templates (separate phase)
3. **Template Marketplace**: Share templates with community
4. **AI-Assisted Extraction**: Use AI to extract data for unknown pages
5. **Batch Operations**: Extract multiple pages at once using same template
6. **Template Analytics**: Track template usage and success rates
7. **Template Suggestions**: Suggest templates based on user behavior
8. **Property Validation**: Validate property types before sending to Octarine

---

## Migration Notes

### From Current Extractors to Templates

**Before** (github-pull-request.ts):
```typescript
export function extractGitHubPullRequest(doc: Document): PageData | null {
  // ... extraction logic
  return {
    title: `${repoName} PR #${prNumber}`,
    content: markdown,
    markdown,
    url
  };
}
```

**After** (templates/github-pr.ts):
```typescript
export const githubPRTemplate: Template = {
  // ... template definition
  extract(doc: Document): Record<string, any> {
    // Same extraction logic, but return properties object
    return {
      title: `${repoName} PR #${prNumber}`,
      prNumber,
      status,
      author,
      reviewers,
      description,
      filesChanged,
      linesAdded,
      linesRemoved,
      url
    };
  }
};
```

**In extractor.ts**:
```typescript
// Before
const githubPR = extractGitHubPullRequest(doc);
if (githubPR) return githubPR;

// After
const templateManager = new TemplateManager();
const extracted = await templateManager.extractData(doc);
if (extracted) return extracted;
```

---

## Open Questions / Decisions Needed

1. Should template preferences be per-workspace or global?
2. Should we support template "presets" (e.g., "Minimal", "Detailed", "Custom")?
3. How to handle template updates in future versions?
4. Should property toggles be in popup or separate settings page?
5. Should we show a diff when user overrides default folder?

---

## Timeline Estimate

- **Phase 1 (Core System)**: 2-3 days
- **Phase 2 (Convert Extractors)**: 1-2 days
- **Phase 3 (UI Components)**: 2-3 days
- **Phase 4 (New Templates)**: 1 day per template

**Total**: ~1-2 weeks for complete implementation

---

## Success Criteria

✅ Templates auto-detect based on URL patterns
✅ Users can toggle properties on/off per template
✅ Users can override default save folder
✅ Manual template selection works with appropriate warnings
✅ All existing extractors converted to template format
✅ Template preferences persist across sessions
✅ Preview updates in real-time when properties toggled
✅ Clean separation between extraction logic and formatting
✅ Easy to add new templates without modifying core code
