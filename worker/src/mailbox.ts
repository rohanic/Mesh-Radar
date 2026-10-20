import { fromB64 } from './crypto';

// Family Circle mailbox (G6, DEC-026). Phones upload the same end-to-end encrypted mesh packets
// they broadcast and fetch everyone else's; the Worker sees only ciphertext under a mailbox ID
// derived from the group key. One mailbox per family keeps the last 24 hours.

export const MAILBOX = {
  maxUpload: 64,
  maxPacketBytes: 12 * 1024,
  maxDownload: 500,
  keepMs: 24 * 3_600_000,
  keepRows: 5_000,
} as const;

export interface MailboxStore {
  append(rows: { at: number; data: string }[]): void;
  since(seq: number, limit: number): { seq: number; data: string }[];
  maxSeq(): number;
  prune(beforeMs: number, keepRows: number): void;
}

export interface SyncBody {
  cursor: string;
  packets: string[];
}

/** Null when the body is acceptable, otherwise the reason. */
export function syncProblem(body: unknown): string | null {
  const b = body as Partial<SyncBody> | null;
  if (!b || typeof b !== 'object') return 'body';
  if (typeof b.cursor !== 'string' || !/^\d{0,16}$/.test(b.cursor)) return 'cursor';
  if (!Array.isArray(b.packets) || b.packets.length > MAILBOX.maxUpload) return 'packets';
  for (const p of b.packets) {
    if (typeof p !== 'string' || p.length === 0) return 'packet';
    try {
      if (fromB64(p).length > MAILBOX.maxPacketBytes) return 'packet_size';
    } catch {
      return 'packet';
    }
  }
  return null;
}

export function sync(store: MailboxStore, body: SyncBody, nowMs: number): { cursor: string; packets: string[] } {
  store.prune(nowMs - MAILBOX.keepMs, MAILBOX.keepRows);
  let cursor = body.cursor ? Number(body.cursor) : 0;
  // A cursor past the end means the mailbox was emptied; start again from the beginning.
  if (cursor > store.maxSeq()) cursor = 0;
  const rows = store.since(cursor, MAILBOX.maxDownload);
  if (body.packets.length) store.append(body.packets.map((data) => ({ at: nowMs, data })));
  return { cursor: String(rows.at(-1)?.seq ?? cursor), packets: rows.map((r) => r.data) };
}

export class MemoryMailboxStore implements MailboxStore {
  rows: { seq: number; at: number; data: string }[] = [];
  private next = 1;
  append(rows: { at: number; data: string }[]) {
    for (const r of rows) this.rows.push({ seq: this.next++, ...r });
  }
  since(seq: number, limit: number) {
    return this.rows.filter((r) => r.seq > seq).slice(0, limit);
  }
  maxSeq() {
    return this.next - 1;
  }
  prune(beforeMs: number, keepRows: number) {
    this.rows = this.rows.filter((r) => r.at >= beforeMs).slice(-keepRows);
  }
}
