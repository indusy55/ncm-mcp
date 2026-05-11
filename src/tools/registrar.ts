import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { isToolAllowed } from '../security.js';
import type { SecurityConfig } from '../security.js';

export type ToolRegistrar = Pick<McpServer, 'registerTool'>;

export function createToolRegistrar(
  server: McpServer,
  security: SecurityConfig,
): ToolRegistrar {
  const registerTool: ToolRegistrar['registerTool'] = ((
    name: string,
    config: unknown,
    cb: unknown,
  ) => {
    if (!isToolAllowed(security, name)) {
      return undefined as never;
    }

    return server.registerTool(name, config as never, cb as never);
  }) as ToolRegistrar['registerTool'];

  return {
    registerTool,
  };
}
