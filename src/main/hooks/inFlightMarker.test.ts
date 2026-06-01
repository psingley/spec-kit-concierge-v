import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { safeWrite } from '../data-layer/fs/safeWrite';
import {
  defaultExpectedArtifacts,
  markerPath,
  readInFlightMarker,
  removeInFlightMarker,
  writeInFlightMarker
} from './inFlightMarker';

const fsMocks = vi.hoisted(() => ({
  readFile: vi.fn(),
  rm: vi.fn()
}));

vi.mock('node:fs/promises', () => ({
  default: {
    readFile: fsMocks.readFile,
    rm: fsMocks.rm
  },
  readFile: fsMocks.readFile,
  rm: fsMocks.rm
}));

vi.mock('../data-layer/fs/safeWrite', () => ({
  safeWrite: vi.fn()
}));

vi.mock('../logging', () => ({
  createMainLogger: vi.fn(() => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }))
}));

const mockedReadFile = vi.mocked(readFile);
const mockedRm = vi.mocked(rm);
const mockedSafeWrite = vi.mocked(safeWrite);

describe('inFlightMarker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('builds deterministic marker paths', () => {
    const result = markerPath({ userDataPath: '/tmp/user', sessionId: 's1', step: 'specify' });

    expect(result).toContain(path.join('/tmp', 'user'));
    expect(result).toContain('in-flight');
    expect(result.endsWith(path.normalize('/s1/specify.marker'))).toBe(true);
  });

  it('writes marker JSON through safeWrite', async () => {
    mockedSafeWrite.mockResolvedValue(undefined);

    await writeInFlightMarker({
      userDataPath: '/tmp/user',
      sessionId: 's1',
      step: 'plan',
      startedAt: '2026-05-27T00:00:00.000Z',
      expectedArtifacts: ['plan.md']
    });

    expect(mockedSafeWrite).toHaveBeenCalledTimes(1);
    expect(mockedSafeWrite.mock.calls[0]?.[0].targetPath).toContain(path.normalize('/s1/plan.marker'));
    expect(JSON.parse(mockedSafeWrite.mock.calls[0]?.[0].contents ?? '{}')).toMatchObject({ step: 'plan', sessionId: 's1' });
  });

  it('reads and validates marker contents', async () => {
    mockedReadFile.mockResolvedValue(JSON.stringify({ step: 'tasks', sessionId: 's2', startedAt: 'now', expectedArtifacts: ['tasks.md'] }));

    const result = await readInFlightMarker({ userDataPath: '/tmp/user', sessionId: 's2', step: 'tasks' });

    expect(result.step).toBe('tasks');
    expect(result.sessionId).toBe('s2');
    expect(result.expectedArtifacts).toEqual(['tasks.md']);
  });

  it('rejects invalid marker contents', async () => {
    mockedReadFile.mockResolvedValue(JSON.stringify({ step: 'specify', sessionId: 'wrong', startedAt: 'now', expectedArtifacts: [] }));

    await expect(readInFlightMarker({ userDataPath: '/tmp/user', sessionId: 's3', step: 'specify' })).rejects.toThrow('InvalidInFlightMarker');
    expect(mockedReadFile).toHaveBeenCalledTimes(1);
    expect(mockedReadFile.mock.calls[0]?.[0]).toContain(path.normalize('/s3/specify.marker'));
  });

  it('removes markers and exposes default artifact expectations', async () => {
    mockedRm.mockResolvedValue(undefined);

    await removeInFlightMarker({ userDataPath: '/tmp/user', sessionId: 's4', step: 'specify' });

    expect(mockedRm).toHaveBeenCalledWith(expect.stringContaining(path.normalize('/s4/specify.marker')), { force: false });
    expect(defaultExpectedArtifacts('specify')).toContain('spec.md');
    expect(defaultExpectedArtifacts('plan')).toContain('research.md');
  });
});
