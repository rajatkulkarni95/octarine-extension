import { describe, expect, it } from 'vitest';
import { renderNestedQuotes } from './nested-quotes';

describe('renderNestedQuotes', () => {
  it('keeps children inside their parent quote and starts new top-level quotes', () => {
    const markdown = renderNestedQuotes([
      { depth: 0, header: '**a**', body: 'Parent\n\nSecond paragraph' },
      { depth: 1, header: '**b**', body: 'Child' },
      { depth: 1, header: '**c**', body: 'Sibling' },
      { depth: 0, header: '**d**', body: 'Next thread' },
    ]);

    expect(markdown).toBe([
      '> **a**',
      '>',
      '> Parent',
      '>',
      '> Second paragraph',
      '>',
      '> > **b**',
      '> >',
      '> > Child',
      '>',
      '> > **c**',
      '> >',
      '> > Sibling',
      '',
      '> **d**',
      '>',
      '> Next thread',
    ].join('\n'));
  });

  it('never skips a nesting level', () => {
    expect(renderNestedQuotes([
      { depth: 2, header: 'orphan', body: '' },
    ])).toBe('> orphan');
  });
});
