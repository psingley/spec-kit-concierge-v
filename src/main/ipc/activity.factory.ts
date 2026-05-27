import {
  invalid,
  isRecord,
  requireExactKeys,
  requireNumber,
  requireRecord,
  requireString,
  type FactoryResult
} from './factoryUtils';

type ErrorName = 'InvalidActivityReadPayload';

export type ActivityReadRequest = {
  limit: number;
};

export type ActivityLogEntry = {
  id: string;
  timestamp: string;
  level: string;
  message: string;
};

export type ActivityReadResponse = {
  entries: ActivityLogEntry[];
  cap: 256;
};

export const createActivityReadRequest = (value: unknown): FactoryResult<ActivityReadRequest, ErrorName> => {
  const root = requireRecord(value, 'InvalidActivityReadPayload', '$');
  if (!root.ok) {
    return root;
  }
  const keys = requireExactKeys(root.value, ['limit'], 'InvalidActivityReadPayload', '$');
  if (!keys.ok) {
    return keys;
  }
  const limit = requireNumber(root.value.limit, 'InvalidActivityReadPayload', '$.limit');
  if (!limit.ok) {
    return limit;
  }
  if (!Number.isInteger(limit.value) || limit.value < 1 || limit.value > 256) {
    return invalid('InvalidActivityReadPayload', 'limit must be an integer from 1 through 256', '$.limit');
  }

  return { ok: true, value: { limit: limit.value } };
};

export const createActivityReadResponse = (value: unknown): FactoryResult<ActivityReadResponse, ErrorName> => {
  const root = requireRecord(value, 'InvalidActivityReadPayload', '$');
  if (!root.ok) {
    return root;
  }
  const keys = requireExactKeys(root.value, ['entries', 'cap'], 'InvalidActivityReadPayload', '$');
  if (!keys.ok) {
    return keys;
  }
  if (root.value.cap !== 256) {
    return invalid('InvalidActivityReadPayload', 'cap must be 256', '$.cap');
  }
  if (!Array.isArray(root.value.entries) || root.value.entries.length > 256) {
    return invalid('InvalidActivityReadPayload', 'entries must be an array capped at 256', '$.entries');
  }
  const entries: ActivityLogEntry[] = [];
  for (const [index, entry] of root.value.entries.entries()) {
    if (!isRecord(entry)) {
      return invalid('InvalidActivityReadPayload', 'entry must be an object', `$.entries[${index}]`);
    }
    const id = requireString(entry.id, 'InvalidActivityReadPayload', `$.entries[${index}].id`);
    if (!id.ok) {
      return id;
    }
    const timestamp = requireString(entry.timestamp, 'InvalidActivityReadPayload', `$.entries[${index}].timestamp`);
    if (!timestamp.ok) {
      return timestamp;
    }
    const level = requireString(entry.level, 'InvalidActivityReadPayload', `$.entries[${index}].level`);
    if (!level.ok) {
      return level;
    }
    const message = requireString(entry.message, 'InvalidActivityReadPayload', `$.entries[${index}].message`);
    if (!message.ok) {
      return message;
    }
    entries.push({ id: id.value, timestamp: timestamp.value, level: level.value, message: message.value });
  }

  return { ok: true, value: { entries, cap: 256 } };
};
