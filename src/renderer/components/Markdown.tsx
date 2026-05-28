import React from 'react';

export type MarkdownProps = {
  text: string;
};

const escapeText = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const Markdown = ({ text }: MarkdownProps): React.ReactElement => {
  const blocks = text.split(/\n{2,}/).filter((block) => block.trim().length > 0);
  return (
    <article className="markdown" data-testid="spec-markdown">
      {blocks.map((block, index) => {
        if (block.startsWith('# ')) {
          return <h1 key={index}>{block.slice(2)}</h1>;
        }
        if (block.startsWith('## ')) {
          return <h2 key={index}>{block.slice(3)}</h2>;
        }
        if (block.startsWith('```')) {
          return <pre key={index}><code>{block.replace(/^```[a-z]*\n?|```$/g, '')}</code></pre>;
        }
        if (block.split(/\n/).every((line) => /^[-*] /.test(line))) {
          return (
            <ul key={index}>
              {block.split(/\n/).map((line) => <li key={line}>{line.slice(2)}</li>)}
            </ul>
          );
        }
        return <p key={index} dangerouslySetInnerHTML={{ __html: escapeText(block) }} />;
      })}
    </article>
  );
};
