import { describe, expect, it } from 'vitest';
import { createTasksDetailRequest, createTasksDetailResponse } from './tasksDetail.factory';

const request = { repositoryPath: '/repo', artifactPath: 'specs/0001/tasks.md' };
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

describe('tasks detail IPC factory', () => {
  it('accepts happy path payloads', () => {
    expect(createTasksDetailRequest(request)).toEqual({ ok: true, value: request });
    expect(createTasksDetailResponse(response)).toEqual({ ok: true, value: response });
  });

  it('rejects empty objects', () => {
    expect(createTasksDetailRequest({})).toMatchObject({ ok: false, error: { name: 'InvalidTasksDetailPayload' } });
    expect(createTasksDetailResponse({})).toMatchObject({ ok: false, error: { name: 'InvalidTasksDetailPayload' } });
  });

  it('rejects null', () => {
    expect(createTasksDetailRequest(null)).toMatchObject({ ok: false, error: { name: 'InvalidTasksDetailPayload' } });
    expect(createTasksDetailResponse(null)).toMatchObject({ ok: false, error: { name: 'InvalidTasksDetailPayload' } });
  });

  it('rejects undefined', () => {
    expect(createTasksDetailRequest(undefined)).toMatchObject({ ok: false, error: { name: 'InvalidTasksDetailPayload' } });
    expect(createTasksDetailResponse(undefined)).toMatchObject({ ok: false, error: { name: 'InvalidTasksDetailPayload' } });
  });

  it('rejects hostile traversal paths', () => {
    expect(createTasksDetailRequest({ ...request, artifactPath: '../tasks.md' })).toMatchObject({ ok: false, error: { name: 'InvalidTasksDetailPayload' } });
  });

  it('rejects partial fields', () => {
    expect(createTasksDetailRequest({ repositoryPath: '/repo' })).toMatchObject({ ok: false, error: { name: 'InvalidTasksDetailPayload' } });
    expect(createTasksDetailResponse({ tasks: [{ id: 'T1' }] })).toMatchObject({ ok: false, error: { name: 'InvalidTasksDetailPayload' } });
  });

  it('accepts tasks without optional phase or acceptance fields', () => {
    expect(createTasksDetailResponse({
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

  it('rejects non-tasks artifact paths', () => {
    expect(createTasksDetailRequest({ ...request, artifactPath: 'spec.md' })).toMatchObject({ ok: false, error: { name: 'InvalidTasksDetailPayload' } });
  });
});
