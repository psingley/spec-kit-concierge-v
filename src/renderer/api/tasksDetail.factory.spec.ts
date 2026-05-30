import { describe, expect, it } from 'vitest';
import { parseRendererTasksDetail } from './tasksDetail.factory';

const response = {
  tasks: [{
    id: 'T1',
    title: 'Move parser',
    phase: 'Foundation',
    dependencies: ['T2'],
    files: ['src/main/domain/tasksDetail.ts'],
    acceptance: 'done'
  }]
};

describe('parseRendererTasksDetail', () => {
  it('accepts happy path payloads', () => {
    expect(parseRendererTasksDetail(response)).toEqual({ ok: true, value: response });
  });

  it('rejects empty objects', () => {
    expect(parseRendererTasksDetail({})).toMatchObject({ ok: false, error: { name: 'InvalidTasksDetail' } });
  });

  it('rejects null', () => {
    expect(parseRendererTasksDetail(null)).toMatchObject({ ok: false, error: { name: 'InvalidTasksDetail' } });
  });

  it('rejects undefined', () => {
    expect(parseRendererTasksDetail(undefined)).toMatchObject({ ok: false, error: { name: 'InvalidTasksDetail' } });
  });

  it('rejects hostile task array shapes', () => {
    expect(parseRendererTasksDetail({ tasks: [{ ...response.tasks[0], dependencies: [1] }] })).toMatchObject({ ok: false, error: { name: 'InvalidTasksDetail' } });
  });

  it('rejects partial fields', () => {
    expect(parseRendererTasksDetail({ tasks: [{ id: 'T1' }] })).toMatchObject({ ok: false, error: { name: 'InvalidTasksDetail' } });
  });

  it('accepts tasks without optional phase or acceptance fields', () => {
    expect(parseRendererTasksDetail({
      tasks: [{
        id: 'T1',
        title: 'Move parser',
        dependencies: [],
        files: []
      }]
    })).toEqual({
      ok: true,
      value: {
        tasks: [{
          id: 'T1',
          title: 'Move parser',
          phase: undefined,
          dependencies: [],
          files: [],
          acceptance: undefined
        }]
      }
    });
  });
});
