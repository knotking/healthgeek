import { ServerTimestampSentinel, Timestamp } from './timestamp';

/**
 * JSON codec for document values.
 *
 * Documents travel between the browser and the API route as JSON, which has no
 * native date type. Timestamps are tagged on the way out and rebuilt on the way
 * in so `doc.data().timestamp.toDate()` keeps working on the client.
 */

const TIMESTAMP_TAG = '__healthgeek_timestamp';
const SERVER_TIMESTAMP_TAG = '__healthgeek_serverTimestamp';

type EncodedTimestamp = { [TIMESTAMP_TAG]: { seconds: number; nanoseconds: number } };
type EncodedServerTimestamp = { [SERVER_TIMESTAMP_TAG]: true };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Converts timestamps/dates/sentinels into tagged JSON. */
export function encodeValue(value: unknown): unknown {
  if (value instanceof Timestamp) {
    return { [TIMESTAMP_TAG]: { seconds: value.seconds, nanoseconds: value.nanoseconds } };
  }
  if (value instanceof Date) {
    return encodeValue(Timestamp.fromDate(value));
  }
  if (value instanceof ServerTimestampSentinel) {
    return { [SERVER_TIMESTAMP_TAG]: true };
  }
  if (Array.isArray(value)) {
    return value.map(encodeValue);
  }
  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {};
    for (const [key, inner] of Object.entries(value)) {
      if (inner === undefined) continue; // match Firestore: undefined fields are dropped
      out[key] = encodeValue(inner);
    }
    return out;
  }
  return value;
}

/** Rebuilds `Timestamp` instances from tagged JSON. */
export function decodeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(decodeValue);
  }
  if (isPlainObject(value)) {
    const tagged = (value as EncodedTimestamp)[TIMESTAMP_TAG];
    if (tagged && typeof tagged === 'object') {
      return new Timestamp(tagged.seconds, tagged.nanoseconds);
    }
    const out: Record<string, unknown> = {};
    for (const [key, inner] of Object.entries(value)) {
      out[key] = decodeValue(inner);
    }
    return out;
  }
  return value;
}

/**
 * Server-side pass that replaces `serverTimestamp()` sentinels with `now`.
 * Runs before a document is written to the store.
 */
export function resolveServerTimestamps(value: unknown, now: Timestamp): unknown {
  if (Array.isArray(value)) {
    return value.map(item => resolveServerTimestamps(item, now));
  }
  if (isPlainObject(value)) {
    if ((value as EncodedServerTimestamp)[SERVER_TIMESTAMP_TAG] === true) {
      return encodeValue(now);
    }
    const out: Record<string, unknown> = {};
    for (const [key, inner] of Object.entries(value)) {
      out[key] = resolveServerTimestamps(inner, now);
    }
    return out;
  }
  return value;
}

/**
 * Reads a stored (encoded) field as a comparable primitive so the query engine
 * can order mixed values. Timestamps compare as milliseconds.
 */
export function comparableOf(value: unknown): unknown {
  if (isPlainObject(value)) {
    const tagged = (value as EncodedTimestamp)[TIMESTAMP_TAG];
    if (tagged && typeof tagged === 'object') {
      return tagged.seconds * 1000 + Math.round(tagged.nanoseconds / 1e6);
    }
  }
  if (value instanceof Timestamp) return value.toMillis();
  if (value instanceof Date) return value.getTime();
  return value;
}
