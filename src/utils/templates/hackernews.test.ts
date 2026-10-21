import { describe, expect, it, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { hackerNewsTemplate } from './hackernews';
import { TemplateManager } from '../template-manager';

vi.mock('webextension-polyfill', () => ({
  default: { storage: { sync: { get: vi.fn().mockResolvedValue({}) } } },
}));

function comment(id: number, indent: number, user: string, html: string): string {
  return `<tr class="athing comtr" id="${id}"><td><table><tr>
    <td class="ind" indent="${indent}"><img src="s.gif" height="1" width="${indent * 40}"></td>
    <td class="default"><div><span class="comhead"><a href="user?id=${user}" class="hnuser">${user}</a>
      <span class="age" title="2026-10-20T08:30:00 1792485000"><a href="item?id=${id}">1 day ago</a></span></span></div>
      <div class="comment"><div class="commtext c00">${html}</div><div class="reply"><p><font size="1"><u><a href="reply?id=${id}">reply</a></u></font></div></div>
    </td></tr></table></td></tr>`;
}

const page = `<!doctype html><html><head><title>Show HN: A thing | Hacker News</title></head><body>
  <table class="fatitem">
    <tr class="athing submission" id="42"><td class="title"><span class="titleline">
      <a href="https://example.com/thing">Show HN: A thing</a>
      <span class="sitebit comhead"> (<a href="from?site=example.com"><span class="sitestr">example.com</span></a>)</span>
    </span></td></tr>
    <tr><td class="subtext"><span class="subline"><span class="score">128 points</span> by
      <a href="user?id=maker" class="hnuser">maker</a>
      <span class="age" title="2026-10-19T12:00:00 1792400000"><a href="item?id=42">2 days ago</a></span></span></td></tr>
    <tr><td><div class="toptext">I built <i>a thing</i>.<p>Feedback welcome.</div></td></tr>
  </table>
  <table class="comment-tree">
    ${comment(1, 0, 'alice', 'Nice work.<p>See <a href="https://example.org/post">this</a>.')}
    ${comment(2, 1, 'maker', 'Thanks!')}
    ${comment(3, 0, 'bob', 'Second thread')}
  </table>
</body></html>`;

describe('Hacker News template', () => {
  const doc = new JSDOM(page, { url: 'https://news.ycombinator.com/item?id=42' }).window.document;

  it('extracts story details', () => {
    expect(hackerNewsTemplate.extract(doc)).toMatchObject({
      title: 'Show HN: A thing',
      hnId: '42',
      storyUrl: 'https://example.com/thing',
      site: 'example.com',
      author: 'maker',
      points: 128,
      commentCount: 3,
      published: '2026-10-19',
      text: 'I built *a thing*.\n\nFeedback welcome.',
    });
  });

  it('renders the comment tree as nested blockquotes without reply links', () => {
    const { comments } = hackerNewsTemplate.extract(doc);
    expect(comments).toBe([
      '> **alice** · [2026-10-20](https://news.ycombinator.com/item?id=1)',
      '>',
      '> Nice work.',
      '>',
      '> See [this](https://example.org/post).',
      '>',
      '> > **maker** · [2026-10-20](https://news.ycombinator.com/item?id=2)',
      '> >',
      '> > Thanks!',
      '',
      '> **bob** · [2026-10-20](https://news.ycombinator.com/item?id=3)',
      '>',
      '> Second thread',
    ].join('\n'));
  });

  it('is not auto-detected until a gallery template uses it', () => {
    const manager = new TemplateManager();
    manager.registerTemplate(hackerNewsTemplate);
    expect(manager.selectTemplate('https://news.ycombinator.com/item?id=42')).toBeNull();
    expect(manager.getTemplate('hackernews')).toBe(hackerNewsTemplate);
  });
});
