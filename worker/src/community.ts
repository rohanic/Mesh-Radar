import { COMMUNITY } from '../../src/core/engine/community';

// Event communities (G7, DEC-036). Posts are signed by per-event pseudonymous keys (checked by the
// router before they reach here), rate limited per key, and hidden after 3 distinct reports.

// A type alias, not an interface, so it satisfies the SQL row constraint in objects.ts.
export type Post = {
  id: string;
  author: string;
  text: string;
  city: string;
  at: number;
};

export interface CommunityStore {
  insertPost(p: Post): void;
  postsByAuthorSince(author: string, sinceMs: number): number;
  latest(limit: number): Post[];
  exists(postId: string): boolean;
  /** False when this reporter already reported the post. */
  addReport(postId: string, reporter: string): boolean;
  reportCount(postId: string): number;
  hide(postId: string): void;
  prune(beforeMs: number): void;
}

export const KEEP_MS = 30 * 86_400_000;

export function listPosts(store: CommunityStore, nowMs: number) {
  store.prune(nowMs - KEEP_MS);
  return store.latest(100).map((p) => ({ id: p.id, author: p.author, text: p.text, city: p.city, atMs: p.at }));
}

export function addPost(store: CommunityStore, p: Post): 'ok' | 'rate_limited' {
  if (store.postsByAuthorSince(p.author, p.at - 3_600_000) >= COMMUNITY.postsPerHour) return 'rate_limited';
  store.insertPost(p);
  return 'ok';
}

export function report(store: CommunityStore, postId: string, reporter: string): 'ok' | 'not_found' | 'duplicate' {
  if (!store.exists(postId)) return 'not_found';
  if (!store.addReport(postId, reporter)) return 'duplicate';
  if (store.reportCount(postId) >= COMMUNITY.reportsToHide) store.hide(postId);
  return 'ok';
}

export class MemoryCommunityStore implements CommunityStore {
  posts: (Post & { hidden: boolean })[] = [];
  reports = new Set<string>();
  insertPost(p: Post) {
    this.posts.push({ ...p, hidden: false });
  }
  postsByAuthorSince(author: string, sinceMs: number) {
    return this.posts.filter((p) => p.author === author && p.at >= sinceMs).length;
  }
  latest(limit: number) {
    return this.posts.filter((p) => !p.hidden).sort((a, b) => b.at - a.at).slice(0, limit);
  }
  exists(postId: string) {
    return this.posts.some((p) => p.id === postId);
  }
  addReport(postId: string, reporter: string) {
    const k = `${postId}:${reporter}`;
    if (this.reports.has(k)) return false;
    this.reports.add(k);
    return true;
  }
  reportCount(postId: string) {
    return [...this.reports].filter((k) => k.startsWith(`${postId}:`)).length;
  }
  hide(postId: string) {
    for (const p of this.posts) if (p.id === postId) p.hidden = true;
  }
  prune(beforeMs: number) {
    this.posts = this.posts.filter((p) => p.at >= beforeMs);
  }
}
