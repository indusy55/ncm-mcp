import type { NcmApiContext } from '../ncm-api.js';
import type { SecurityConfig } from '../security.js';
import { normalizeKnownMethodResult } from './normalizers.js';
import { registerAuthTools } from './auth-tools.js';
import { registerMusicTools } from './music-tools.js';
import { registerPlaylistTools } from './playlist-tools.js';
import { createToolRegistrar } from './registrar.js';
import { registerSocialTools } from './social-tools.js';

export { normalizeKnownMethodResult };

export function registerAllTools(
  server: import('@modelcontextprotocol/sdk/server/mcp.js').McpServer,
  context: NcmApiContext,
  security: SecurityConfig,
): void {
  const registrar = createToolRegistrar(server, security);

  registerMusicTools(registrar, context, security);
  registerPlaylistTools(registrar, context, security);
  registerSocialTools(registrar, context, security);
  registerAuthTools(registrar, context, security);
}
