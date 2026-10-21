# Template gallery

Extra clipping templates that are not installed by default. Pick one, copy its JSON, and import it into the extension.

| Template | Matches | What you get |
| --- | --- | --- |
| [Hacker News Thread](hackernews-thread.json) | `news.ycombinator.com/item?id=*` | The story link and text, then the whole comment tree as nested blockquotes |
| [X Thread](x-thread.json) | `x.com/*/status/*` | The post and the author's self-replies, the parent post as context, and visible replies as nested blockquotes |

## Install a template

1. Open a template file above and copy its contents. On GitHub, use the **Raw** view or the copy button.
2. In the extension, open **Settings → Templates → Import**.
3. Paste the JSON and click **Import template**.

The template then shows up as a custom template. You can edit its URL pattern, folder, properties, and Markdown like any other custom template, and use **Copy template JSON** on its card to share your version.

On X, the clip includes every reply you have scrolled past since opening the post, even after X unloads it. Scroll down to include more replies, then clip. If the post itself was never on screen while the extension was watching (for example, the page loaded already scrolled down), the clipper asks you to scroll back up to it.

## File format

```json
{
  "schemaVersion": 1,
  "name": "Hacker News Thread",
  "description": "Shown on the template card.",
  "urlPattern": "news.ycombinator.com/item?id=*",
  "baseTemplateId": "hackernews",
  "folder": "Social/Hacker News",
  "propertiesEnabled": true,
  "properties": [
    { "name": "author", "type": "string", "value": "{{author}}" }
  ],
  "contentTemplate": "{if:comments}## Comments\n\n{comments}{/if}"
}
```

- `urlPattern` uses `*` as a wildcard and matches against the host, path, and query string unless it includes a protocol.
- `baseTemplateId` is optional. Without it, the template runs on the generic article extractor and can use `{title}`, `{content}`, `{url}`, and the page metadata variables. With it, the template uses a site-specific extractor that ships with the extension and gets that extractor's variables.
- `properties[].type` is one of `string`, `number`, `date`, `datetime`, `checkbox`, `list`, or `tags`. Property values use `{{variable}}`; the content template uses `{variable}`, `{if:variable}…{/if}`, and `{each:variable}…{/each}`.

### Extractors

| `baseTemplateId` | Variables |
| --- | --- |
| `hackernews` | `title`, `url`, `hnId`, `storyUrl`, `site`, `author`, `points`, `commentCount`, `published`, `text` (the story or Ask HN text), `comments` (nested blockquotes) |
| `x-thread` | `title`, `url`, `statusId`, `author`, `handle`, `published`, `likes`, `reposts`, `views`, `replyCount`, `context` (the posts it replies to), `thread` (the post and the author's continuation), `replies` (nested blockquotes) |
| `github-pr`, `github-issues` | See the built-in GitHub templates in Settings |

Extractors that power gallery templates are registered as optional in `src/utils/templates/index.ts`. They are never auto-detected, so they only run once someone imports a template that uses them.

## Add a template

- **No new extraction needed:** add a JSON file here and a row to the table above. It works with the released extension as soon as it is merged.
- **Needs site-specific extraction:** add an extractor in `src/utils/templates/` with `optional = true`, add it to `optionalTemplates`, add the JSON file here, and document its variables above. The template needs an extension release that includes the extractor. Importing it into an older version shows an "update the extension" message.

`pnpm test:run` validates every JSON file in this folder.
