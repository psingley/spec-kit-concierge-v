import { markdownToAdf } from 'marklassian';

export type AdfDocument = ReturnType<typeof markdownToAdf>;

const stripLocalIds = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(stripLocalIds);
  }
  if (typeof value === 'object' && value !== null) {
    const source = value as Record<string, unknown>;
    return Object.keys(source).sort().reduce<Record<string, unknown>>((acc, key) => {
      if (key !== 'localId') {
        acc[key] = stripLocalIds(source[key]);
      }
      return acc;
    }, {});
  }
  return value;
};

export const markdownToDeterministicAdf = (markdown: string): AdfDocument =>
  stripLocalIds(markdownToAdf(markdown)) as AdfDocument;
