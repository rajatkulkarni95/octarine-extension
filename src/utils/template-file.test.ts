import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseTemplateFile, serializeTemplateFile } from './template-file';

const KNOWN_IDS = ['github-pr', 'github-issues', 'hackernews', 'x-thread'];
const galleryDir = join(__dirname, '../../templates');

describe('template files', () => {
  it.each(readdirSync(galleryDir).filter((file) => file.endsWith('.json')))(
    'gallery template %s is valid',
    (file) => {
      const json = readFileSync(join(galleryDir, file), 'utf8');
      expect(() => parseTemplateFile(json, KNOWN_IDS)).not.toThrow();
    },
  );

  it('imports a template with fresh ids', () => {
    const { template, settings } = parseTemplateFile(
      readFileSync(join(galleryDir, 'hackernews-thread.json'), 'utf8'),
      KNOWN_IDS,
      () => 'custom-test',
    );
    expect(template).toMatchObject({
      id: 'custom-test',
      name: 'Hacker News Thread',
      urlPattern: 'news.ycombinator.com/item?id=*',
      baseTemplateId: 'hackernews',
    });
    expect(settings.folder).toBe('Social/Hacker News');
    expect(settings.properties[0]).toEqual({ id: 'prop-0-title', name: 'title', type: 'string', value: '{{title}}' });
  });

  it('round-trips through serialization', () => {
    const imported = parseTemplateFile(
      readFileSync(join(galleryDir, 'x-thread.json'), 'utf8'),
      KNOWN_IDS,
      () => 'custom-a',
    );
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
