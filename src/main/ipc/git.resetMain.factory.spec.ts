import { describe, expect, it } from 'vitest';
import { createGitResetMainRequest } from './git.factory';

describe('git resetMain IPC request factory', () => {
  it('accepts a request with a defaultBranch', () => {
    expect(createGitResetMainRequest({ repositoryPath: '/repo', defaultBranch: 'develop' })).toEqual({
      ok: true,
      value: { repositoryPath: '/repo', defaultBranch: 'develop' }
    });
  });

  it('accepts a request WITHOUT a defaultBranch (optional, falls back to main downstream)', () => {
    expect(createGitResetMainRequest({ repositoryPath: '/repo' })).toEqual({
      ok: true,
      value: { repositoryPath: '/repo', defaultBranch: undefined }
    });
  });

  it('rejects an empty object', () => {
    expect(createGitResetMainRequest({})).toMatchObject({ ok: false, error: { name: 'InvalidGitMutationPayload' } });
  });

  it('rejects null', () => {
    expect(createGitResetMainRequest(null)).toMatchObject({ ok: false, error: { name: 'InvalidGitMutationPayload' } });
  });

  it('rejects a hostile non-string defaultBranch', () => {
    expect(createGitResetMainRequest({ repositoryPath: '/repo', defaultBranch: 42 })).toMatchObject({
      ok: false,
      error: { name: 'InvalidGitMutationPayload' }
    });
  });

  it('rejects an unsafe defaultBranch ref name', () => {
    expect(createGitResetMainRequest({ repositoryPath: '/repo', defaultBranch: '--evil' })).toMatchObject({
      ok: false,
      error: { name: 'InvalidGitMutationPayload' }
    });
  });
});
