# Run 8 Markdown Render Findings

Pre-spec Action 2 used a temporary npm project at `/tmp/run8-md-probe`. No sample renderer code was kept in the repository.

## Probe Setup

Installed only:

- `react@18.3.1`
- `react-dom@18.3.1`
- `react-markdown`
- `rehype-sanitize`
- `remark-gfm`

Rendered with:

```tsx
<ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
  {sample}
</ReactMarkdown>
```

## Sample Coverage

The sample included headings, a GFM table, task lists, fenced TypeScript code, blockquotes, links, inline code, nested lists, and hostile raw HTML:

````md
# Heading 1

## Heading 2

| Item | State |
| --- | --- |
| Plan | done |
| Tasks | [link](https://example.com) |

- [x] checked task
- [ ] unchecked task

`inline code` and **bold** text.

```ts
const value: string = "safe";
```

> Blockquote text

1. Parent
   - Nested child

<script>alert('xss')</script>

<div onclick="alert('x')">raw html</div>
````

## Render Findings

- Headings render as `h1` and `h2`.
- GFM tables render as `<table>` with `<thead>` and `<tbody>`.
- GFM task lists render disabled checkbox inputs with checked/unchecked state.
- Inline code renders as `<code>`.
- Fenced code preserves `class="language-ts"` on the code element.
- Blockquotes and nested lists render structurally.
- Links preserve safe `href` output.
- The hostile `<script>` input is stripped.
- The raw `<div onclick="...">` input is stripped because `rehype-raw` is not enabled.

## Run 8 Implications

- The locked dependency set is sufficient for Plan/Tasks/Analyze markdown artifacts.
- Run 8 should not add `rehype-raw` or syntax-highlighting libraries.
- Styling must account for tables, task-list checkbox inputs, nested lists, blockquotes, and fenced code blocks.
- `Markdown.tsx` should add a size guard before rendering large artifact bodies, but virtualization can remain deferred.
