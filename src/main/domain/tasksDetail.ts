export type ParsedTask = {
  id: string;
  title: string;
  phase?: string;
  dependencies: string[];
  files: string[];
  acceptance?: string;
};

export const parseTaskDetails = (markdown: string): ParsedTask[] => {
  let currentPhase: string | undefined;
  return markdown.split(/\r?\n/).flatMap((line): ParsedTask[] => {
    const phase = /^##+\s+(?:Phase\s+\d+\s*[-:]\s*)?(.*)$/i.exec(line);
    if (phase !== null) {
      currentPhase = phase[1]?.trim();
      return [];
    }
    const task = /^-\s+\[[ xX]\]\s+(T\d+)\s+(.*)$/.exec(line.trim());
    if (task === null) {
      return [];
    }
    const body = task[2] ?? '';
    const files = Array.from(body.matchAll(/`([^`]+\.(?:ts|tsx|md|json|css))`/g)).map((match) => match[1] ?? '').filter(Boolean);
    const dependencies = Array.from(body.matchAll(/\b(T\d+)\b/g)).map((match) => match[1] ?? '').filter((id) => id !== task[1]);
    const acceptance = /acceptance\s*:\s*(.*)$/i.exec(body)?.[1]?.trim();
    return [{
      id: task[1] ?? '',
      title: body.replace(/\s+Acceptance\s*:\s*.*$/i, '').trim(),
      phase: currentPhase,
      dependencies,
      files,
      acceptance
    }];
  });
};
