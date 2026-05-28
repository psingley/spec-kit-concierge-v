import { describe, expect, it } from 'vitest';
import { parseRendererRepositories } from './repositories.factory';

const repo = { id: '1', name: 'site', owner: 'collette-travel', path: '/repo/site', defaultBranch: 'main' };
const repos = { repositories: [repo] };

describe('parseRendererRepositories', () => {
  it('accepts happy path payloads', () => {
    expect(parseRendererRepositories(repos)).toEqual({ ok: true, value: repos });
  });
  it('rejects empty objects', () => {
    expect(parseRendererRepositories({})).toMatchObject({ ok: false, error: { name: 'InvalidRepositories' } });
  });
  it('rejects null', () => {
    expect(parseRendererRepositories(null)).toMatchObject({ ok: false, error: { name: 'InvalidRepositories' } });
  });
  it('rejects undefined', () => {
    expect(parseRendererRepositories(undefined)).toMatchObject({ ok: false, error: { name: 'InvalidRepositories' } });
  });
  it('rejects hostile repository field types', () => {
    expect(parseRendererRepositories({ repositories: [{ ...repo, path: 1 }] })).toMatchObject({ ok: false, error: { name: 'InvalidRepositories' } });
  });
  it('rejects partial fields', () => {
    expect(parseRendererRepositories({ repositories: [{ id: '1' }] })).toMatchObject({ ok: false, error: { name: 'InvalidRepositories' } });
  });
  it('rejects extra keys', () => {
    expect(parseRendererRepositories({ repositories: [{ ...repo, injected: true }] })).toMatchObject({ ok: false, error: { name: 'InvalidRendererBoundaryPayload', path: '$.injected' } });
  });
});
