import { describe, expect, it } from 'vitest';
import { parseTaskDetails } from './tasksDetail';

describe('parseTaskDetails', () => {
  it('parses task rows with phase, dependencies, files, and acceptance', () => {
    const markdown = [
      '## Phase 1 - Foundation',
      '- [ ] T1 Move parser to `src/main/domain/tasksDetail.ts` after T2 Acceptance: parser has identical output',
      '- [x] T2 Add tests for `src/renderer/components/TaskViewer.tsx` and `tasks.md`'
    ].join('\n');

    expect(parseTaskDetails(markdown)).toEqual([
      {
        id: 'T1',
        title: 'Move parser to `src/main/domain/tasksDetail.ts` after T2',
        phase: 'Foundation',
        dependencies: ['T2'],
        files: ['src/main/domain/tasksDetail.ts'],
        acceptance: 'parser has identical output'
      },
      {
        id: 'T2',
        title: 'Add tests for `src/renderer/components/TaskViewer.tsx` and `tasks.md`',
        phase: 'Foundation',
        dependencies: [],
        files: ['src/renderer/components/TaskViewer.tsx', 'tasks.md'],
        acceptance: undefined
      }
    ]);
  });

  it('parses colon phase headers and acceptance case-insensitively', () => {
    const markdown = [
      '### Phase 12: Polish',
      '- [X] T12 Wire `package.json` ACCEPTANCE: done'
    ].join('\n');

    expect(parseTaskDetails(markdown)).toEqual([
      {
        id: 'T12',
        title: 'Wire `package.json`',
        phase: 'Polish',
        dependencies: [],
        files: ['package.json'],
        acceptance: 'done'
      }
    ]);
  });

  it('silently drops malformed and non-matching lines', () => {
    const markdown = [
      '# Tasks',
      '- [ ] TX Not numeric',
      '- T3 Missing checkbox',
      '- [ ] T4Missing required space',
      '- [ ] T5 Valid task'
    ].join('\n');

    expect(parseTaskDetails(markdown)).toEqual([
      {
        id: 'T5',
        title: 'Valid task',
        phase: undefined,
        dependencies: [],
        files: [],
        acceptance: undefined
      }
    ]);
  });

  it('returns an empty array for empty input', () => {
    expect(parseTaskDetails('')).toEqual([]);
  });
});
