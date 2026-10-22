import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseTemplateFile, serializeTemplateFile } from './template-file';

const KNOWN_IDS = ['github-pr', 'github-issues', 'hackernews', 'x-thread'];
const galleryDir = join(__dirname, '../../templates');

const sample = JSON.stringify({
  schemaVersion: 1,
  name: 'Recipe Pages',
  description: 'Save recipes',
  urlPattern: '*.example-recipes.com/*',
  folder: 'Recipes',
  properties: [
    { name: 'source', type: 'string', value: '{{url}}' },
    { name: 'tags', type: 'tags', value: 'recipe' },
  ],
  contentTemplate: '# {title}\n\n{content}',
});

describe('template files', () => {
  it('every gallery template is valid', () => {
    const files = existsSync(galleryDir)
      ? readdirSync(galleryDir).filter((file) => file.endsWith('.json'))
      : [];
    for (const file of files) {
      const json = readFileSync(join(galleryDir, file), 'utf8');
      expect(() => parseTemplateFile(json, KNOWN_IDS), file).not.toThrow();
    }
  });

  it('imports a template with fresh ids', () => {
    const { template, settings } = parseTemplateFile(sample, KNOWN_IDS, () => 'custom-test');
    expect(template).toEqual({
      id: 'custom-test',
      name: 'Recipe Pages',
      description: 'Save recipes',
      urlPattern: '*.example-recipes.com/*',
      baseTemplateId: undefined,
    });
    expect(settings).toMatchObject({ folder: 'Recipes', propertiesEnabled: true });
    expect(settings.properties[0]).toEqual({ id: 'prop-0-source', name: 'source', type: 'string', value: '{{url}}' });
  });

  it('round-trips through serialization', () => {
    const imported = parseTemplateFile(sample, KNOWN_IDS, () => 'custom-a');
    const again = parseTemplateFile(
      serializeTemplateFile(imported.template, imported.settings),
      KNOWN_IDS,
      () => 'custom-a',
    );
    expect(again).toEqual(imported);
  });

  it('explains unknown extractors and invalid input', () => {
    const file = JSON.stringify({
      schemaVersion: 1, name: 'Future', urlPattern: '*', folder: 'X', contentTemplate: '{content}', baseTemplateId: 'reddit',
    });
    expect(() => parseTemplateFile(file, KNOWN_IDS)).toThrow(/"reddit" extractor/);
    expect(() => parseTemplateFile('{', KNOWN_IDS)).toThrow(/not valid JSON/);
    expect(() => parseTemplateFile('{"schemaVersion":1}', KNOWN_IDS)).toThrow(/"name"/);
  });
});
