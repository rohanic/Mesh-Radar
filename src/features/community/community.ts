import { extra } from '@/features/engine/config';

// Event communities (G7, DEC-003): opt-in public pages per event, online only, served by the
// Worker. Posts are short text; authors are per-event pseudonyms; three reports hide a post.

export interface CommunityPost {
  id: string;
  author: string;
  text: string;
  city: string;
  atMs: number;
}

function base(): string | null {
  return extra.apiBaseUrl ? extra.apiBaseUrl.replace(/\/$/, '') : null;
}

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

export async function createPost(eventId: string, author: string, text: string, city: string): Promise<boolean> {
  const b = base();
  if (!b) return false;
  try {
    const r = await fetch(`${b}/v1/community/${encodeURIComponent(eventId)}/posts`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ author, text: text.slice(0, 500), city: city.slice(0, 60) }),
    });
    return r.ok;
  } catch {
    return false;
  }
}

export async function reportPost(eventId: string, postId: string, reporter: string): Promise<boolean> {
  const b = base();
  if (!b) return false;
  try {
    const r = await fetch(`${b}/v1/community/${encodeURIComponent(eventId)}/report`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ postId, reporter }),
    });
    return r.ok;
  } catch {
    return false;
  }
}
