import { afterEach, describe, expect, it, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { xThreadTemplate } from './x-thread';
import { TemplateExtractionError } from '../../types/template';

function post(id: string, name: string, handle: string, text: string, extra = '', y?: number): string {
  const style = y === undefined ? '' : ` style="transform: translateY(${y}px)"`;
  return `<div data-testid="cellInnerDiv"${style}><article data-testid="tweet">
    <div data-testid="User-Name"><a href="/${handle}"><span>${name}</span></a><a href="/${handle}"><span>@${handle}</span></a>
      <a href="/${handle}/status/${id}"><time datetime="2026-10-20T09:15:00.000Z">Oct 20</time></a></div>
    <div data-testid="tweetText"><span>${text}</span></div>
    ${extra}
  </article></div>`;
}

function separator(y?: number): string {
  const style = y === undefined ? '' : ` style="transform: translateY(${y}px)"`;
  return `<div data-testid="cellInnerDiv"${style}><div></div></div>`;
}

const focalStats = '<div role="group" aria-label="12 replies, 3,400 reposts, 56 likes, 2 bookmarks, 78,901 views"></div>';

function createDocument(body: string, url = 'https://x.com/ada/status/2'): Document {
  return new JSDOM(`<!doctype html><html><head><title>Ada on X: "Thread time" / X</title></head><body>${body}</body></html>`, { url }).window.document;
}

describe('X thread template', () => {
  const doc = createDocument(`
    ${post('1', 'Grace', 'grace', 'What are you building?')}
    ${post('2', 'Ada', 'ada', 'Thread time <img alt="🧵" src="emoji.svg">', `
      <div data-testid="tweetPhoto"><img src="https://pbs.twimg.com/media/a.jpg"></div>
      ${focalStats}`)}
    ${post('3', 'Ada', 'ada', 'Part two')}
    ${separator()}
    ${post('4', 'Bob', 'bob', 'Great thread')}
    ${post('5', 'Ada', 'ada', 'Thanks Bob')}
    ${separator()}
    ${post('6', 'Cy', 'cy', 'Separate reply')}
  `);
  const data = xThreadTemplate.extract(doc);

  it('extracts the focal post details and stats', () => {
    expect(data).toMatchObject({
      title: 'Ada on X: "Thread time"',
      statusId: '2',
      author: 'Ada',
      handle: '@ada',
      published: '2026-10-20',
      replyCount: 12,
      reposts: 3400,
      likes: 56,
      views: 78901,
    });
  });

  it("joins the author's continuation into the thread body", () => {
    expect(data.thread).toBe('Thread time 🧵\n\n![](https://pbs.twimg.com/media/a.jpg)\n\nPart two');
  });

  it('renders the parent as context and replies as nested quotes', () => {
    expect(data.context).toBe([
      '> **Grace** @grace · [2026-10-20](https://x.com/grace/status/1)',
      '>',
      '> What are you building?',
    ].join('\n'));
    expect(data.replies).toBe([
      '> **Bob** @bob · [2026-10-20](https://x.com/bob/status/4)',
      '>',
      '> Great thread',
      '>',
      '> > **Ada** @ada · [2026-10-20](https://x.com/ada/status/5)',
      '> >',
      '> > Thanks Bob',
      '',
      '> **Cy** @cy · [2026-10-20](https://x.com/cy/status/6)',
      '>',
      '> Separate reply',
    ].join('\n'));
  });
});

describe('X thread template while scrolling', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps posts X removed from the DOM and orders them by position', () => {
    const doc = createDocument(`
      ${post('2', 'Ada', 'ada', 'Thread time', focalStats, 0)}
      ${separator(400)}
      ${post('4', 'Bob', 'bob', 'Great thread', '', 500)}
      ${post('5', 'Ada', 'ada', 'Thanks Bob', '', 700)}
    `);
    xThreadTemplate.extract(doc);

    // Scrolled down: X unmounted the focal post and first chain and mounted later replies.
    doc.body.innerHTML = `
      ${post('5', 'Ada', 'ada', 'Thanks Bob', '', 700)}
      ${separator(900)}
      ${post('6', 'Cy', 'cy', 'Separate reply', '', 1000)}
    `;
    const data = xThreadTemplate.extract(doc);

    expect(data).toMatchObject({ handle: '@ada', likes: 56, thread: 'Thread time' });
    expect(data.replies).toContain('> **Bob** @bob');
    expect(data.replies).toContain('> > **Ada** @ada');
    expect(String(data.replies).indexOf('Bob')).toBeLessThan(String(data.replies).indexOf('Cy'));
  });

  it('collects posts in the background while watching', async () => {
    vi.useFakeTimers();
    const doc = createDocument(`${post('2', 'Ada', 'ada', 'Thread time', focalStats, 0)}`);
    const stop = xThreadTemplate.watch(doc);

    doc.body.innerHTML = `${separator(400)}${post('4', 'Bob', 'bob', 'Great thread', '', 500)}`;
    await Promise.resolve();
    vi.advanceTimersByTime(300);
    doc.body.innerHTML = `${separator(900)}${post('6', 'Cy', 'cy', 'Separate reply', '', 1000)}`;
    stop();

    const data = xThreadTemplate.extract(doc);
    expect(data.thread).toBe('Thread time');
    expect(data.replies).toContain('Great thread');
    expect(data.replies).toContain('Separate reply');
  });

  it('asks the user to scroll up when the main post was never seen', () => {
    const doc = createDocument(`${separator(900)}${post('6', 'Cy', 'cy', 'Separate reply', '', 1000)}`);
    expect(() => xThreadTemplate.extract(doc)).toThrow(TemplateExtractionError);
  });

  it('stops at the "Discover more" section', () => {
    const doc = createDocument(`
      ${post('2', 'Ada', 'ada', 'Thread time', focalStats, 0)}
      ${separator(400)}
      ${post('4', 'Bob', 'bob', 'Great thread', '', 500)}
      <div data-testid="cellInnerDiv" style="transform: translateY(700px)"><h2>Discover more</h2></div>
      ${post('99', 'Zed', 'zed', 'Unrelated post', '', 800)}
    `);
    const data = xThreadTemplate.extract(doc);
    expect(data.replies).toContain('Great thread');
    expect(data.replies).not.toContain('Unrelated post');
  });
});
