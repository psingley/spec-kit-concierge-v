import { describe, expect, it } from 'vitest';
import { parseRendererBranchSessions } from './branches.factory';

const restoredStates = { specify: 'complete', clarify: 'pending', plan: 'not_available', tasks: 'not_available', analyze: 'not_available', review: 'not_available' };
const branch = { branch: 'spec/0006-specify-vertical', label: 'Specify vertical', restoredStates };
const sessions = { sessions: [branch] };

describe('parseRendererBranchSessions', () => {
  it('accepts happy path payloads', () => {
    expect(parseRendererBranchSessions(sessions)).toEqual({ ok: true, value: sessions });
  });
  it('rejects empty objects', () => {
    expect(parseRendererBranchSessions({})).toMatchObject({ ok: false, error: { name: 'InvalidBranchSessions' } });
  });
  it('rejects null', () => {
    expect(parseRendererBranchSessions(null)).toMatchObject({ ok: false, error: { name: 'InvalidBranchSessions' } });
  });
  it('rejects undefined', () => {
    expect(parseRendererBranchSessions(undefined)).toMatchObject({ ok: false, error: { name: 'InvalidBranchSessions' } });
  });
  it('rejects hostile step states', () => {
    expect(parseRendererBranchSessions({ sessions: [{ ...branch, restoredStates: { ...restoredStates, specify: 'done' } }] })).toMatchObject({ ok: false, error: { name: 'InvalidBranchSessions' } });
  });
  it('rejects partial fields', () => {
    expect(parseRendererBranchSessions({ sessions: [{ branch: 'spec/x' }] })).toMatchObject({ ok: false, error: { name: 'InvalidBranchSessions' } });
  });
  it('rejects extra keys', () => {
    expect(parseRendererBranchSessions({ sessions: [{ ...branch, injected: true }] })).toMatchObject({ ok: false, error: { name: 'InvalidRendererBoundaryPayload', path: '$.injected' } });
  });
});
