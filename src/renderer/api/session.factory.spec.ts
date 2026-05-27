import { describe, expect, it } from 'vitest';
import { parseRendererSessionCreate, parseRendererSessionList } from './session.factory';

export const rendererSessionList = { sessions: [{ sessionId: 's1', title: 'Work', cwd: '/repo', updatedAt: 'now' }] };
export const rendererSessionCreate = { sessionId: 's2', currentModeId: 'mode', currentModelId: 'model' };

describe('parseRendererSessionList', () => {
  describe('happy path', () => {
    it('accepts valid preload session lists', () => {
      expect(parseRendererSessionList(rendererSessionList)).toEqual({ ok: true, value: rendererSessionList });
    });
  });

  describe('empty object', () => {
    it('returns a named error', () => {
      expect(parseRendererSessionList({})).toMatchObject({ ok: false, error: { name: 'InvalidSessionState' } });
    });
  });

  describe('null', () => {
    it('returns a named error', () => {
      expect(parseRendererSessionList(null)).toMatchObject({ ok: false, error: { name: 'InvalidSessionState' } });
    });
  });

  describe('undefined', () => {
    it('returns a named error', () => {
      expect(parseRendererSessionList(undefined)).toMatchObject({ ok: false, error: { name: 'InvalidSessionState' } });
    });
  });

  describe('factory-specific hostile case', () => {
    it('rejects a session missing its id', () => {
      expect(parseRendererSessionList({ sessions: [{ title: 'missing id' }] })).toMatchObject({
        ok: false,
        error: { name: 'InvalidSessionState' }
      });
    });
  });

  describe('partial structurally-plausible case', () => {
    it('rejects the wrong root collection key', () => {
      expect(parseRendererSessionList({ session: [] })).toMatchObject({
        ok: false,
        error: { name: 'InvalidSessionState' }
      });
    });
  });

  describe('extra fields', () => {
    it('returns a stable renderer boundary payload error', () => {
      expect(parseRendererSessionList({ ...rendererSessionList, injected: true })).toMatchObject({
        ok: false,
        error: { name: 'InvalidRendererBoundaryPayload', path: '$.injected' }
      });
    });
  });
});

describe('parseRendererSessionCreate', () => {
  describe('happy path', () => {
    it('accepts valid preload session creation results', () => {
      expect(parseRendererSessionCreate(rendererSessionCreate)).toEqual({ ok: true, value: rendererSessionCreate });
    });
  });

  describe('empty object', () => {
    it('returns a named error', () => {
      expect(parseRendererSessionCreate({})).toMatchObject({ ok: false, error: { name: 'InvalidSessionState' } });
    });
  });

  describe('null', () => {
    it('returns a named error', () => {
      expect(parseRendererSessionCreate(null)).toMatchObject({ ok: false, error: { name: 'InvalidSessionState' } });
    });
  });

  describe('undefined', () => {
    it('returns a named error', () => {
      expect(parseRendererSessionCreate(undefined)).toMatchObject({ ok: false, error: { name: 'InvalidSessionState' } });
    });
  });

  describe('factory-specific hostile case', () => {
    it('rejects an empty session id', () => {
      expect(parseRendererSessionCreate({ ...rendererSessionCreate, sessionId: '' })).toMatchObject({
        ok: false,
        error: { name: 'InvalidSessionState' }
      });
    });
  });

  describe('partial structurally-plausible case', () => {
    it('rejects missing session id', () => {
      expect(parseRendererSessionCreate({ currentModeId: 'mode' })).toMatchObject({
        ok: false,
        error: { name: 'InvalidSessionState' }
      });
    });
  });

  describe('extra-key rejection (renderer trust boundary exact-key closure)', () => {
    it('rejects valid input with an injected extra key', () => {
      expect(
        parseRendererSessionCreate({ ...rendererSessionCreate, injected: true })
      ).toMatchObject({
        ok: false,
        error: { name: 'InvalidRendererBoundaryPayload' }
      });
    });
  });
});
