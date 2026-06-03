export const stripInlineComment = (value: string): string =>
  value.replace(/\s+#.*$/, '').trim();

export const scalarValue = (line: string): string | undefined => {
  let value = line.split(':').slice(1).join(':').trim();
  if (value.length === 0) return undefined;
  value = stripInlineComment(value);
  value = value.replace(/^["']|["']$/g, '').trim();
  return value.length > 0 ? value : undefined;
};

export const findTopLevelScalar = (lines: string[], keys: string[]): string | undefined => {
  for (const line of lines) {
    if (/^\s*#/.test(line) || /^\s/.test(line)) continue;
    const key = keys.find((candidate) => new RegExp(`^${candidate}:\\s*`).test(line));
    if (key !== undefined) return scalarValue(line);
  }
  return undefined;
};

export const findExplicitProjectKey = (raw: string): string | undefined => {
  const lines = raw.split(/\r?\n/);
  const keyLineIndex = lines.findIndex((line) => /^\s*project:\s*$/.test(line));
  return keyLineIndex >= 0
    ? scalarValue(lines.slice(keyLineIndex + 1).find((line) => /^\s+key:\s*/.test(line)) ?? '')
    : undefined;
};
