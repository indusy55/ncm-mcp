import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { NcmApiContext } from '../ncm-api.js';
import type { SecurityConfig } from '../security.js';
import { normalizeKnownMethodResult } from './normalizers.js';
import { registerAuthTools } from './auth-tools.js';
import { registerMusicTools } from './music-tools.js';
import { registerPlaylistTools } from './playlist-tools.js';
import { registerSocialTools } from './social-tools.js';

export { normalizeKnownMethodResult };

export function registerAllTools(
  server: McpServer,
  context: NcmApiContext,
  security: SecurityConfig,
): void {
  registerMusicTools(server, context, security);
  registerPlaylistTools(server, context, security);
  registerSocialTools(server, context, security);
  registerAuthTools(server, context, security);
}
