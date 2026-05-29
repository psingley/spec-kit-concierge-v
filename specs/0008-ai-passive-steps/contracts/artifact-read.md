# Contract: Artifact Read

## Capability

Run 8 keeps the shipped plural capability:

```text
artifacts:read
```

No singular `artifact:read` alias is added in Run 8.

## Request

```ts
type ArtifactReadRequest = {
  repositoryPath: string;
  branchName: string;
  artifactPath: string;
};
```

Validation:
- `artifactPath` must refer to a validated evidence path or a safe metadata path exposed by the current passive step summary.
- Artifact content is requested only after explicit user action, such as clicking an evidence pill.
- Listeners and status rows must not eagerly prefetch artifact bodies.

## Response

```ts
type ArtifactReadResponse = {
  path: string;
  kind: 'text' | 'markdown' | 'code' | 'image' | 'pdf';
  sizeBytes: number;
  mtime?: string;
  oversized: boolean;
  binary: boolean;
  content?: string;
  metadata: {
    extension?: string;
    displayName: string;
    availableActions: Array<'copy-path' | 'open-external' | 'save-as'>;
  };
};
```

Rules:
- Text, markdown, and code artifacts at or below 512 KiB may include `content`.
- Text, markdown, and code artifacts over 512 KiB return `oversized: true` and omit `content`.
- Image and PDF artifacts return metadata and omit inline content.
- Binary or unsupported files return metadata and safe actions only.
- Missing optional Plan artifacts do not fail Plan; absent evidence is omitted or marked unavailable before read.

## Markdown Rendering

Markdown content is rendered by:

```tsx
<ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
  {content}
</ReactMarkdown>
```

Rules:
- Support headings, tables, task lists, fenced code classes, links, blockquotes, nested lists, inline code, and plain text.
- Strip hostile raw HTML, scripts, and event handlers.
- Do not enable `rehype-raw`.
- Do not add syntax highlighting libraries in Run 8.

## Cache and Invalidation

RTK Query keys artifact reads by `{ repositoryPath, branchName, artifactPath }`. Any step mutation that validates or changes the same path invalidates that cache entry.

## Accessibility

Artifact viewer:
- Opens from a keyboard-operable evidence affordance.
- Has an accessible dialog name.
- Moves focus into the dialog and restores focus on close.
- Announces oversized/binary metadata-only state without color-only cues.
