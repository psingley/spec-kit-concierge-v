import React from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';

export type MarkdownProps = {
  text: string;
};

const MAX_RENDER_BYTES = 512 * 1024;

export const Markdown = ({ text }: MarkdownProps): React.ReactElement => {
  if (new Blob([text]).size > MAX_RENDER_BYTES) {
    return (
      <article className="markdown" data-testid="spec-markdown">
        <p role="status">This artifact is too large for inline preview. Open it in the external editor.</p>
      </article>
    );
  }

  return (
    <article className="markdown" data-testid="spec-markdown">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
        {text}
      </ReactMarkdown>
    </article>
  );
};
