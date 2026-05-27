import {
  invalid,
  isRecord,
  requireRecord,
  requireExactKeys,
  requireString,
  type RendererBoundaryErrorName,
  type RendererFactoryResult
} from './factoryUtils';

type ErrorName = 'InvalidActivityState';

export type RendererActivityEntry = {
  id: string;
  timestamp: string;
  level: string;
  message: string;
};

export type RendererActivityState = {
  entries: RendererActivityEntry[];
  cap: 256;
};

export const parseRendererActivity = (
  value: unknown
): RendererFactoryResult<RendererActivityState, RendererBoundaryErrorName<ErrorName>> => {
  const root = requireRecord(value, 'InvalidActivityState', '$');
  if (!root.ok) {
    return root;
  }
  if (root.value.cap !== 256) {
    return invalid('InvalidActivityState', 'cap must be 256', '$.cap');
  }
  if (!Array.isArray(root.value.entries) || root.value.entries.length > 256) {
    return invalid('InvalidActivityState', 'entries must be an array capped at 256', '$.entries');
  }
  const exactKeys = requireExactKeys<ErrorName>(root.value, ['entries', 'cap']);
  if (!exactKeys.ok) {
    return exactKeys;
  }
  const entries: RendererActivityEntry[] = [];
  for (const [index, entry] of root.value.entries.entries()) {
    if (!isRecord(entry)) {
      return invalid('InvalidActivityState', 'entry must be an object', `$.entries[${index}]`);
    }
    const id = requireString(entry.id, 'InvalidActivityState', `$.entries[${index}].id`);
    if (!id.ok) {
      return id;
    }
    const timestamp = requireString(entry.timestamp, 'InvalidActivityState', `$.entries[${index}].timestamp`);
    if (!timestamp.ok) {
      return timestamp;
    }
    const level = requireString(entry.level, 'InvalidActivityState', `$.entries[${index}].level`);
    if (!level.ok) {
      return level;
    }
    const message = requireString(entry.message, 'InvalidActivityState', `$.entries[${index}].message`);
    if (!message.ok) {
      return message;
    }
    entries.push({ id: id.value, timestamp: timestamp.value, level: level.value, message: message.value });
  }

  return { ok: true, value: { entries, cap: 256 } };
};
