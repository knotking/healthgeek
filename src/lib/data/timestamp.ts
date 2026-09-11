/**
 * A portable timestamp value object.
 *
 * The app was originally written against Firestore's `Timestamp`, so this keeps
 * the same shape (`seconds`/`nanoseconds`, `toDate()`, `Timestamp.fromDate()`)
 * and can be used on both the client and the server.
 */
export class Timestamp {
  readonly seconds: number;
  readonly nanoseconds: number;

  constructor(seconds: number, nanoseconds: number) {
    this.seconds = seconds;
    this.nanoseconds = nanoseconds;
  }

  static now(): Timestamp {
    return Timestamp.fromMillis(Date.now());
  }

  static fromDate(date: Date): Timestamp {
    return Timestamp.fromMillis(date.getTime());
  }

  static fromMillis(millis: number): Timestamp {
    const seconds = Math.floor(millis / 1000);
    return new Timestamp(seconds, (millis - seconds * 1000) * 1e6);
  }

  toDate(): Date {
    return new Date(this.toMillis());
  }

  toMillis(): number {
    return this.seconds * 1000 + Math.round(this.nanoseconds / 1e6);
  }

  isEqual(other: Timestamp): boolean {
    return this.seconds === other.seconds && this.nanoseconds === other.nanoseconds;
  }

  /** Sorts correctly when coerced, e.g. `a < b` or `Math.min(...)`. */
  valueOf(): number {
    return this.toMillis();
  }

  toString(): string {
    return `Timestamp(seconds=${this.seconds}, nanoseconds=${this.nanoseconds})`;
  }

  toJSON() {
    return { seconds: this.seconds, nanoseconds: this.nanoseconds };
  }
}

/** Sentinel asking the server to stamp the field with its own clock. */
export class ServerTimestampSentinel {
  readonly _kind = 'serverTimestamp' as const;
}

export function serverTimestamp(): ServerTimestampSentinel {
  return new ServerTimestampSentinel();
}
