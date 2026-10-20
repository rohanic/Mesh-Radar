import type { Play } from './play';

export interface MailboxRpc {
  sync(body: { cursor: string; packets: string[] }, nowMs: number): Promise<{ cursor: string; packets: string[] }>;
}

export interface CommunityRpc {
  list(nowMs: number): Promise<{ id: string; author: string; text: string; city: string; atMs: number }[]>;
  post(p: { id: string; author: string; text: string; city: string; at: number }): Promise<'ok' | 'rate_limited'>;
  report(postId: string, reporter: string): Promise<'ok' | 'not_found' | 'duplicate'>;
}

/** The parts of a Durable Object namespace the router uses (also implemented by test fakes). */
export interface Namespace<T> {
  idFromName(name: string): unknown;
  get(id: never): T;
}

export interface Env {
  KV: KVNamespace;
  MAILBOX: Namespace<MailboxRpc>;
  COMMUNITY: Namespace<CommunityRpc>;
  PACKAGE_NAME: string;
  /** Secrets (wrangler secret put): never in wrangler.toml or the repo. */
  LICENCE_SIGNING_SEED: string;
  GOOGLE_SERVICE_ACCOUNT_JSON: string;
  ADMIN_TOKEN: string;
  /** Tests inject a fake Play client. */
  play?: Play;
}
