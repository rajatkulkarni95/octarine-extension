# Template gallery

Extra clipping templates that are not installed by default. Pick one, copy its JSON, and import it into the extension.

| Template | Matches | What you get |
| --- | --- | --- |
| _None yet_ | | |

The Hacker News and X thread templates ship as built-ins, so they don't need importing.

## Install a template

1. Open a template file above and copy its contents. On GitHub, use the **Raw** view or the copy button.
2. In the extension, open **Settings → Templates → Import**.
3. Paste the JSON and click **Import template**.

The template then shows up as a custom template. You can edit its URL pattern, folder, properties, and Markdown like any other custom template, and use **Copy template JSON** on its card to share your version.

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
- `baseTemplateId` is optional. Without it, the template runs on the generic article extractor and can use `{title}`, `{content}`, `{url}`, and the page metadata variables. With it, the template reuses a built-in template's extractor and gets that extractor's variables, for example to clip Hacker News threads into a different folder or layout.
- `properties[].type` is one of `string`, `number`, `date`, `datetime`, `checkbox`, `list`, or `tags`. Property values use `{{variable}}`; the content template uses `{variable}`, `{if:variable}…{/if}`, and `{each:variable}…{/each}`.

### Extractors

| `baseTemplateId` | Variables |
| --- | --- |
| `hackernews` (news.ycombinator.com, hckrnws.com) | `title`, `url`, `hnId`, `storyUrl`, `site`, `author`, `points`, `commentCount`, `published`, `text` (the story or Ask HN text), `comments` (nested blockquotes) |
| `x-thread` | `title`, `url`, `statusId`, `author`, `handle`, `published`, `likes`, `reposts`, `views`, `replyCount`, `context` (the posts it replies to), `thread` (the post and the author's continuation), `replies` (nested blockquotes) |
| `github-pr`, `github-issues` | See the built-in GitHub templates in Settings |

## Add a template

- **No new extraction needed:** add a JSON file here and a row to the table above. It works with the released extension as soon as it is merged.
- **Needs site-specific extraction:** that's a built-in template. Add it in `src/utils/templates/`, register it in `builtInTemplates`, and document its variables above. A gallery template can then build on it with `baseTemplateId`, which needs an extension release that includes it. Importing it into an older version shows an "update the extension" message.

`pnpm test:run` validates every JSON file in this folder.
