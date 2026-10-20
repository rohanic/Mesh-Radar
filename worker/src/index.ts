import type { Env } from './env';
import { route } from './router';

export { Community, Mailbox } from './objects';

export default {
  fetch: (req: Request, env: Env) => route(req, env),
} satisfies ExportedHandler<Env>;
