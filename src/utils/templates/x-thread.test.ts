import { describe, expect, it } from 'vitest';
import { JSDOM } from 'jsdom';
import { xThreadTemplate } from './x-thread';

function post(id: string, name: string, handle: string, text: string, extra = ''): string {
  return `<div data-testid="cellInnerDiv"><article data-testid="tweet">
    <div data-testid="User-Name"><a href="/${handle}"><span>${name}</span></a><a href="/${handle}"><span>@${handle}</span></a>
      <a href="/${handle}/status/${id}"><time datetime="2026-10-20T09:15:00.000Z">Oct 20</time></a></div>
    <div data-testid="tweetText"><span>${text}</span></div>
    ${extra}
  </article></div>`;
}

const separator = '<div data-testid="cellInnerDiv"><div></div></div>';

const page = `<!doctype html><html><head><title>Ada on X: "Thread time" / X</title></head><body>
  ${post('1', 'Grace', 'grace', 'What are you building?')}
  ${post('2', 'Ada', 'ada', 'Thread time <img alt="🧵" src="emoji.svg">', `
    <div data-testid="tweetPhoto"><img src="https://pbs.twimg.com/media/a.jpg"></div>
    <div role="group" aria-label="12 replies, 3,400 reposts, 56 likes, 2 bookmarks, 78,901 views"></div>`)}
  ${post('3', 'Ada', 'ada', 'Part two')}
  ${separator}
  ${post('4', 'Bob', 'bob', 'Great thread')}
  ${post('5', 'Ada', 'ada', 'Thanks Bob')}
  ${separator}
  ${post('6', 'Cy', 'cy', 'Separate reply')}
</body></html>`;

describe('X thread template', () => {
  const doc = new JSDOM(page, { url: 'https://x.com/ada/status/2' }).window.document;
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
