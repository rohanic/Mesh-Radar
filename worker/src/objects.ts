import { DurableObject } from 'cloudflare:workers';

import { addPost, listPosts, report, type CommunityStore, type Post } from './community';
import { sync, type MailboxStore } from './mailbox';

// SQLite-backed Durable Objects: one mailbox per Family Circle, one community per event.

class SqlMailboxStore implements MailboxStore {
  constructor(private sql: SqlStorage) {
    sql.exec('CREATE TABLE IF NOT EXISTS packets (seq INTEGER PRIMARY KEY AUTOINCREMENT, at INTEGER NOT NULL, data TEXT NOT NULL)');
  }
  append(rows: { at: number; data: string }[]) {
    for (const r of rows) this.sql.exec('INSERT INTO packets (at, data) VALUES (?, ?)', r.at, r.data);
  }
  since(seq: number, limit: number) {
    return this.sql.exec<{ seq: number; data: string }>('SELECT seq, data FROM packets WHERE seq > ? ORDER BY seq LIMIT ?', seq, limit).toArray();
  }
  maxSeq() {
    return this.sql.exec<{ m: number }>('SELECT COALESCE(MAX(seq), 0) AS m FROM packets').one().m;
  }
  prune(beforeMs: number, keepRows: number) {
    this.sql.exec('DELETE FROM packets WHERE at < ?', beforeMs);
    this.sql.exec('DELETE FROM packets WHERE seq <= (SELECT MAX(seq) FROM packets) - ?', keepRows);
  }
}

export class Mailbox extends DurableObject {
  private store = new SqlMailboxStore(this.ctx.storage.sql);
  async sync(body: { cursor: string; packets: string[] }, nowMs: number) {
    return sync(this.store, body, nowMs);
  }
}

class SqlCommunityStore implements CommunityStore {
  constructor(private sql: SqlStorage) {
    sql.exec('CREATE TABLE IF NOT EXISTS posts (id TEXT PRIMARY KEY, author TEXT NOT NULL, text TEXT NOT NULL, city TEXT NOT NULL, at INTEGER NOT NULL, hidden INTEGER NOT NULL DEFAULT 0)');
    sql.exec('CREATE TABLE IF NOT EXISTS reports (post_id TEXT NOT NULL, reporter TEXT NOT NULL, PRIMARY KEY (post_id, reporter))');
  }
  insertPost(p: Post) {
    this.sql.exec('INSERT INTO posts (id, author, text, city, at) VALUES (?, ?, ?, ?, ?)', p.id, p.author, p.text, p.city, p.at);
  }
  postsByAuthorSince(author: string, sinceMs: number) {
    return this.sql.exec<{ n: number }>('SELECT COUNT(*) AS n FROM posts WHERE author = ? AND at >= ?', author, sinceMs).one().n;
  }
  latest(limit: number) {
    return this.sql.exec<Post>('SELECT id, author, text, city, at FROM posts WHERE hidden = 0 ORDER BY at DESC LIMIT ?', limit).toArray();
  }
  exists(postId: string) {
    return this.sql.exec<{ n: number }>('SELECT COUNT(*) AS n FROM posts WHERE id = ?', postId).one().n > 0;
  }
  addReport(postId: string, reporter: string) {
    return this.sql.exec('INSERT OR IGNORE INTO reports (post_id, reporter) VALUES (?, ?)', postId, reporter).rowsWritten > 0;
  }
  reportCount(postId: string) {
    return this.sql.exec<{ n: number }>('SELECT COUNT(*) AS n FROM reports WHERE post_id = ?', postId).one().n;
  }
  hide(postId: string) {
    this.sql.exec('UPDATE posts SET hidden = 1 WHERE id = ?', postId);
  }
  prune(beforeMs: number) {
    this.sql.exec('DELETE FROM reports WHERE post_id IN (SELECT id FROM posts WHERE at < ?)', beforeMs);
    this.sql.exec('DELETE FROM posts WHERE at < ?', beforeMs);
  }
}

export class Community extends DurableObject {
  private store = new SqlCommunityStore(this.ctx.storage.sql);
  async list(nowMs: number) {
    return listPosts(this.store, nowMs);
  }
  async post(p: Post) {
    return addPost(this.store, p);
  }
  async report(postId: string, reporter: string) {
    return report(this.store, postId, reporter);
  }
}
