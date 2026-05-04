// @dutyhive/env — re-exports.
// Server-only env in '@dutyhive/env/server'; client-safe vars in '@dutyhive/env/client'.

export { env as serverEnv } from './server';
export { clientEnv } from './client';
