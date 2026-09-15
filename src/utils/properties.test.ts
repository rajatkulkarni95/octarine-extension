import { describe, it, expect } from 'vitest';
import {
  resolveTemplateVariable,
  resolveProperties,
  propertiesToRecord,
  propertiesToMetadata,
} from './properties';
import type { PageData } from '../types';
import type { PropertyDefinition } from '../types/settings';

describe('properties', () => {
  const mockPageData: PageData = {
    title: 'Test Article Title',
    url: 'https://example.com/article',
    content: '<p>Content</p>',
    markdown: 'Content',
    author: 'John Doe',
    publishedDate: '2024-01-15',
    siteName: 'Example Site',
    description: 'A test article description',
    metadata: {
      title: 'OG Title',
      source: 'https://example.com/article',
      author: 'Meta Author',
      published: '2024-01-15',
      description: 'Meta description',
      siteName: 'Example Site',
      image: 'https://example.com/image.jpg',
      tags: ['tag1', 'tag2', 'tag3'],
    },
  };

  describe('resolveTemplateVariable', () => {
    it('should resolve {{title}} variable', () => {
      const result = resolveTemplateVariable('{{title}}', mockPageData);
      expect(result).toBe('Test Article Title');
    });

    it('should resolve {{url}} variable', () => {
      const result = resolveTemplateVariable('{{url}}', mockPageData);
      expect(result).toBe('https://example.com/article');
    });

    it('should resolve {{source}} as alias for url', () => {
      const result = resolveTemplateVariable('{{source}}', mockPageData);
      expect(result).toBe('https://example.com/article');
    });

    it('should resolve {{author}} variable', () => {
      const result = resolveTemplateVariable('{{author}}', mockPageData);
      expect(result).toBe('John Doe');
    });

    it('should resolve {{published}} variable', () => {
      const result = resolveTemplateVariable('{{published}}', mockPageData);
      expect(result).toBe('2024-01-15');
    });

    it('should resolve {{description}} variable', () => {
      const result = resolveTemplateVariable('{{description}}', mockPageData);
      expect(result).toBe('A test article description');
    });

    it('should resolve {{siteName}} variable', () => {
      const result = resolveTemplateVariable('{{siteName}}', mockPageData);
      expect(result).toBe('Example Site');
    });

    it('should resolve {{tags}} variable as comma-separated string', () => {
      const result = resolveTemplateVariable('{{tags}}', mockPageData);
      expect(result).toBe('tag1, tag2, tag3');
    });

    it('should resolve {{image}} variable', () => {
      const result = resolveTemplateVariable('{{image}}', mockPageData);
      expect(result).toBe('https://example.com/image.jpg');
    });

    it('should resolve raw Open Graph metadata variables', () => {
      const result = resolveTemplateVariable('{{og:image}}', {
        ...mockPageData,
        metadata: {
          ...mockPageData.metadata,
          'og:image': 'https://example.com/open-graph.jpg',
        },
      });
      expect(result).toBe('https://example.com/open-graph.jpg');
    });

    it('should resolve {{clippedAt}} to current ISO timestamp', () => {
      const result = resolveTemplateVariable('{{clippedAt}}', mockPageData);
      // Should be a valid ISO date string
      expect(() => new Date(result)).not.toThrow();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should handle multiple variables in one template', () => {
      const result = resolveTemplateVariable('By {{author}} on {{siteName}}', mockPageData);
      expect(result).toBe('By John Doe on Example Site');
    });

    it('should return empty string for unknown variables', () => {
      const result = resolveTemplateVariable('{{unknown}}', mockPageData);
      expect(result).toBe('');
    });

    it('should return empty string for null pageData', () => {
      const result = resolveTemplateVariable('{{title}}', null);
      expect(result).toBe('{{title}}');
    });

    it('should return template as-is for empty template', () => {
      const result = resolveTemplateVariable('', mockPageData);
      expect(result).toBe('');
    });

    it('should preserve static text without variables', () => {
      const result = resolveTemplateVariable('Static text', mockPageData);
      expect(result).toBe('Static text');
    });

    it('should handle mixed static text and variables', () => {
      const result = resolveTemplateVariable('Title: {{title}} ({{siteName}})', mockPageData);
      expect(result).toBe('Title: Test Article Title (Example Site)');
    });

    it('should fall back to metadata author when pageData author is missing', () => {
      const dataWithoutAuthor: PageData = {
        ...mockPageData,
        author: undefined,
      };
      const result = resolveTemplateVariable('{{author}}', dataWithoutAuthor);
      expect(result).toBe('Meta Author');
    });

    it('should fall back to metadata for missing description', () => {
      const dataWithoutDesc: PageData = {
        ...mockPageData,
        description: undefined,
      };
      const result = resolveTemplateVariable('{{description}}', dataWithoutDesc);
      expect(result).toBe('Meta description');
    });

    it('should handle pageData with no metadata', () => {
      const dataWithoutMetadata: PageData = {
        title: 'Simple Title',
        url: 'https://example.com',
        content: '',
        markdown: '',
      };
      const result = resolveTemplateVariable('{{title}}', dataWithoutMetadata);
      expect(result).toBe('Simple Title');
    });

    it('should return empty for tags when no tags exist', () => {
      const dataWithoutTags: PageData = {
        ...mockPageData,
        metadata: {
          ...mockPageData.metadata,
          tags: undefined,
        },
      };
      const result = resolveTemplateVariable('{{tags}}', dataWithoutTags);
      expect(result).toBe('');
    });
  });

  describe('resolveProperties', () => {
    const properties: PropertyDefinition[] = [
      { id: 'prop-1', name: 'title', type: 'string', value: '{{title}}' },
      { id: 'prop-2', name: 'source', type: 'string', value: '{{url}}' },
      { id: 'prop-3', name: 'author', type: 'string', value: '{{author}}' },
      { id: 'prop-4', name: 'tags', type: 'list', value: '{{tags}}' },
      { id: 'prop-5', name: 'custom', type: 'string', value: 'Static value' },
    ];

    it('should resolve all property definitions', () => {
      const resolved = resolveProperties(properties, mockPageData);
      
      expect(resolved).toHaveLength(5);
      expect(resolved[0]).toEqual({
        id: 'prop-1',
        name: 'title',
        type: 'string',
        value: 'Test Article Title',
      });
      expect(resolved[1]).toEqual({
        id: 'prop-2',
        name: 'source',
        type: 'string',
        value: 'https://example.com/article',
      });
    });

    it('should preserve property types', () => {
      const resolved = resolveProperties(properties, mockPageData);
      
      expect(resolved[0].type).toBe('string');
      expect(resolved[1].type).toBe('string');
      expect(resolved[3].type).toBe('list');
    });

    it('should handle static values', () => {
      const resolved = resolveProperties(properties, mockPageData);
      
      expect(resolved[4].value).toBe('Static value');
    });

    it('should handle null pageData', () => {
      const resolved = resolveProperties(properties, null);
      
      expect(resolved[0].value).toBe('{{title}}');
      expect(resolved[4].value).toBe('Static value');
    });

    it('should handle empty properties array', () => {
      const resolved = resolveProperties([], mockPageData);
      expect(resolved).toHaveLength(0);
    });
  });

  describe('propertiesToRecord', () => {
    it('should convert text properties to string values', () => {
      const resolved = [
        { id: '1', name: 'title', type: 'string' as const, value: 'Test Title' },
        { id: '2', name: 'author', type: 'string' as const, value: 'John Doe' },
      ];
      
      const record = propertiesToRecord(resolved);
      
      expect(record).toEqual({
        title: 'Test Title',
        author: 'John Doe',
      });
    });

    it('should convert list properties to arrays', () => {
      const resolved = [
        { id: '1', name: 'tags', type: 'list' as const, value: 'tag1, tag2, tag3' },
      ];
      
      const record = propertiesToRecord(resolved);
      
      expect(record).toEqual({
        tags: ['tag1', 'tag2', 'tag3'],
      });
    });

    it('should trim whitespace from list items', () => {
      const resolved = [
        { id: '1', name: 'tags', type: 'list' as const, value: '  tag1  ,  tag2  ,  tag3  ' },
      ];
      
      const record = propertiesToRecord(resolved);
      
      expect(record.tags).toEqual(['tag1', 'tag2', 'tag3']);
    });

    it('should filter empty list items', () => {
      const resolved = [
        { id: '1', name: 'tags', type: 'list' as const, value: 'tag1,, tag2,   , tag3' },
      ];
      
      const record = propertiesToRecord(resolved);
      
      expect(record.tags).toEqual(['tag1', 'tag2', 'tag3']);
    });

    it('should handle all property types', () => {
      const resolved = [
        { id: '1', name: 'title', type: 'string' as const, value: 'Title' },
        { id: '2', name: 'count', type: 'number' as const, value: '42' },
        { id: '3', name: 'date', type: 'date' as const, value: '2024-01-15' },
        { id: '4', name: 'link', type: 'string' as const, value: 'https://example.com' },
        { id: '5', name: 'done', type: 'checkbox' as const, value: 'true' },
      ];
      
      const record = propertiesToRecord(resolved);
      
      expect(record.title).toBe('Title');
      expect(record.count).toBe(42);
      expect(record.date).toBe('2024-01-15');
      expect(record.link).toBe('https://example.com');
      expect(record.done).toBe(true);
    });

    it('should emit tags arrays and ignore reserved Octarine properties', () => {
      const record = propertiesToRecord([
        { id: '1', name: 'topics', type: 'tags', value: 'research, web' },
        { id: '2', name: 'oct.internal', type: 'string', value: 'hidden' },
      ]);

      expect(record).toEqual({ topics: ['research', 'web'] });
    });

    it('should handle empty properties array', () => {
      const record = propertiesToRecord([]);
      expect(record).toEqual({});
    });
  });

  describe('propertiesToMetadata', () => {
    it('should convert text properties to strings', () => {
      const resolved = [
        { id: '1', name: 'title', type: 'string' as const, value: 'Test Title' },
      ];
      
      const metadata = propertiesToMetadata(resolved);
      
      expect(metadata.title).toBe('Test Title');
    });

    it('should convert list properties to arrays', () => {
      const resolved = [
        { id: '1', name: 'tags', type: 'list' as const, value: 'tag1, tag2' },
      ];
      
      const metadata = propertiesToMetadata(resolved);
      
      expect(metadata.tags).toEqual(['tag1', 'tag2']);
    });

    it('should preserve an explicitly empty string value', () => {
      const resolved = [
        { id: '1', name: 'author', type: 'string' as const, value: '' },
      ];
      
      const metadata = propertiesToMetadata(resolved);
      
      expect(metadata.author).toBe('');
    });

    it('should handle multiple properties of different types', () => {
      const resolved = [
        { id: '1', name: 'title', type: 'string' as const, value: 'Title' },
        { id: '2', name: 'tags', type: 'list' as const, value: 'a, b, c' },
        { id: '3', name: 'empty', type: 'string' as const, value: '' },
        { id: '4', name: 'url', type: 'string' as const, value: 'https://example.com' },
      ];
      
      const metadata = propertiesToMetadata(resolved);
      
      expect(metadata).toEqual({
        title: 'Title',
        tags: ['a', 'b', 'c'],
        empty: '',
        url: 'https://example.com',
      });
    });
  });
});
