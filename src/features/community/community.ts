import { COMMUNITY, postSigningMessage, reportSigningMessage } from '@/core/engine/community';
import { extra } from '@/features/engine/config';
import { MeshEngine } from 'mesh-engine';

// Event communities (G7, DEC-036): opt-in public pages per event, online only, served by the
// Worker. Authors are per-event pseudonymous keys; posts and reports are signed with them.

export interface CommunityPost {
  id: string;
  /** Author's per-event public key (hex). */
  author: string;
  text: string;
  city: string;
  atMs: number;
}

function base(): string | null {
  return extra.apiBaseUrl ? extra.apiBaseUrl.replace(/\/$/, '') : null;
}

const nowSec = () => Math.floor(Date.now() / 1000);

export async function fetchPosts(eventId: string): Promise<CommunityPost[] | null> {
  const b = base();
  if (!b) return null;
  try {
    const r = await fetch(`${b}/v1/community/${encodeURIComponent(eventId)}/posts`);
    if (!r.ok) return null;
    const body = (await r.json()) as { posts: CommunityPost[] };
    return body.posts;
  } catch {
    return null;
  }
}

export async function createPost(eventId: string, text: string, city: string): Promise<boolean> {
  const b = base();
  if (!b) return false;
  try {
    const pk = await MeshEngine.eventPublicKey(eventId);
    const post = { eventId, pk, city: city.slice(0, COMMUNITY.cityChars), text: text.slice(0, COMMUNITY.textChars), ts: nowSec() };
    const sig = await MeshEngine.signForEvent(eventId, postSigningMessage(post));
    const r = await fetch(`${b}/v1/community/${encodeURIComponent(eventId)}/posts`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ pk, city: post.city, text: post.text, ts: post.ts, sig }),
    });
    return r.ok;
  } catch {
    return false;
  }
}

export async function reportPost(eventId: string, postId: string): Promise<boolean> {
  const b = base();
  if (!b) return false;
  try {
    const pk = await MeshEngine.eventPublicKey(eventId);
    const ts = nowSec();
    const sig = await MeshEngine.signForEvent(eventId, reportSigningMessage({ eventId, pk, postId, ts }));
    const r = await fetch(`${b}/v1/community/${encodeURIComponent(eventId)}/report`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ pk, postId, ts, sig }),
    });
    return r.ok;
  } catch {
    return false;
  }
}
