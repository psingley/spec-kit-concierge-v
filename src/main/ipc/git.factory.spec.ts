import { describe, expect, it } from 'vitest';
import { createGitReadRequest, createGitReadResponse } from './git.factory';

const validRequest = { repositoryPath: '/repo', paths: ['src'] };
const validResponse = { branch: 'main', ahead: 1, behind: 2, dirty: true, uncommittedPaths: ['a.ts'] };

describe('git IPC factory', () => {
  describe('happy path', () => {
    it('accepts a valid request payload', () => {
      expect(createGitReadRequest(validRequest)).toEqual({ ok: true, value: validRequest });
    });

    it('accepts a valid response payload', () => {
      expect(createGitReadResponse(validResponse)).toEqual({ ok: true, value: validResponse });
    });
  });

  describe('empty object', () => {
    it('rejects a request payload', () => {
      expect(createGitReadRequest({})).toMatchObject({ ok: false, error: { name: 'InvalidGitReadPayload' } });
    });

    it('rejects a response payload', () => {
      expect(createGitReadResponse({})).toMatchObject({ ok: false, error: { name: 'InvalidGitReadPayload' } });
    });
  });

  describe('null', () => {
    it('rejects a request payload', () => {
      expect(createGitReadRequest(null)).toMatchObject({ ok: false, error: { name: 'InvalidGitReadPayload' } });
    });

    it('rejects a response payload', () => {
      expect(createGitReadResponse(null)).toMatchObject({ ok: false, error: { name: 'InvalidGitReadPayload' } });
    });
  });

  describe('undefined', () => {
    it('rejects a request payload', () => {
      expect(createGitReadRequest(undefined)).toMatchObject({ ok: false, error: { name: 'InvalidGitReadPayload' } });
    });

    it('rejects a response payload', () => {
      expect(createGitReadResponse(undefined)).toMatchObject({ ok: false, error: { name: 'InvalidGitReadPayload' } });
    });
  });

  describe('factory-specific hostile case', () => {
    it('rejects invalid path arrays', () => {
      expect(createGitReadRequest({ repositoryPath: '/repo', paths: [1] })).toMatchObject({ ok: false, error: { name: 'InvalidGitReadPayload' } });
    });

    it('rejects invalid numeric fields', () => {
      expect(createGitReadResponse({ ...validResponse, ahead: '1' })).toMatchObject({ ok: false, error: { name: 'InvalidGitReadPayload' } });
    });
  });

  describe('partial structurally-plausible case', () => {
    it('rejects a partial request shape', () => {
      expect(createGitReadRequest({ paths: [] })).toMatchObject({ ok: false, error: { name: 'InvalidGitReadPayload' } });
    });

    it('rejects a partial response shape', () => {
      expect(createGitReadResponse({ branch: 'main', ahead: 0 })).toMatchObject({ ok: false, error: { name: 'InvalidGitReadPayload' } });
    });
  });
});
