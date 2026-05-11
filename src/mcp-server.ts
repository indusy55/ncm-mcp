import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { registerAllTools } from './tools/index.js';
import type { NcmApiContext, NcmMethodMeta } from './ncm-api.js';
import { isMethodAllowed, loadSecurityConfig } from './security.js';
import { getServerSessionSnapshot } from './server-session.js';

function toPrettyJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function buildMethodText(method: NcmMethodMeta): string {
  return `${method.name}\nroute: ${method.route}`;
}

function buildMethodResource(
  method: NcmMethodMeta,
): { uri: string; text: string } {
  return {
    uri: `ncm://methods/${method.name}`,
    text: toPrettyJson(method),
  };
}

export function createNcmMcpServer(context: NcmApiContext): McpServer {
  const security = loadSecurityConfig();
  const server = new McpServer(
    {
      name: 'ncm-mcp',
      version: '0.1.0',
    },
    {
      capabilities: {
        logging: {},
      },
    },
  );

  registerAllTools(server, context, security);

  server.registerTool(
    'ncm_list_methods',
    {
      description: 'List available Netease Cloud Music API methods.',
      inputSchema: z.object({
        keyword: z.string().trim().min(1).optional(),
        limit: z.number().int().min(1).max(200).default(50),
        offset: z.number().int().min(0).default(0),
      }),
    },
    async ({ keyword, limit, offset }) => {
      const currentSecurity = loadSecurityConfig();
      const filtered = keyword
        ? context.methods.filter(
            (method) =>
              method.name.includes(keyword) || method.route.includes(keyword),
          )
        : context.methods;

      const allowed = filtered.filter((method) =>
        isMethodAllowed(currentSecurity, method.name),
      );
      const items = allowed.slice(offset, offset + limit);

      return {
        content: [
          {
            type: 'text',
            text: items.length
              ? items.map(buildMethodText).join('\n\n')
              : 'No methods matched.',
          },
        ],
        structuredContent: {
          total: allowed.length,
          limit,
          offset,
          items,
        },
      };
    },
  );

  server.registerTool(
    'ncm_describe_method',
    {
      description: 'Get route information for one API method.',
      inputSchema: z.object({
        method: z.string().trim().min(1),
      }),
    },
    async ({ method }) => {
      const currentSecurity = loadSecurityConfig();
      const found = context.methodsByName.get(method);

      if (!found || !isMethodAllowed(currentSecurity, found.name)) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Unknown or disabled method: ${method}`,
            },
          ],
          structuredContent: {
            method,
            available: false,
          },
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: buildMethodText(found),
          },
        ],
        structuredContent: {
          ...found,
          available: true,
        },
      };
    },
  );

  server.registerResource(
    'ncm-methods',
    'ncm://methods',
    {
      mimeType: 'application/json',
    },
    async () => ({
      contents: [
        {
          uri: 'ncm://methods',
          mimeType: 'application/json',
          text: toPrettyJson(
            context.methods.filter((method) =>
              isMethodAllowed(loadSecurityConfig(), method.name),
            ),
          ),
        },
      ],
    }),
  );

  server.registerResource(
    'ncm-security',
    'ncm://security',
    {
      mimeType: 'application/json',
    },
    async () => {
      const currentSecurity = loadSecurityConfig();
      const currentSession = getServerSessionSnapshot();

      return {
        contents: [
          {
            uri: 'ncm://security',
            mimeType: 'application/json',
            text: toPrettyJson({
              allowWriteTools: currentSecurity.allowWriteTools,
              exposeLoginPage: currentSecurity.exposeLoginPage,
              serverSession: currentSession,
            }),
          },
        ],
      };
    },
  );

  server.registerResource(
    'ncm-login-guide',
    'ncm://login-guide',
    {
      mimeType: 'application/markdown',
    },
    async () => {
      const currentSecurity = loadSecurityConfig();
      const currentSession = getServerSessionSnapshot();

      return {
        contents: [
          {
            uri: 'ncm://login-guide',
            mimeType: 'application/markdown',
            text: [
              '# Login Guide',
              '',
              `Server session active: ${currentSession.active}`,
              `Authenticated reads enabled: ${currentSession.active}`,
              `Write tools enabled: ${currentSecurity.allowWriteTools}`,
              `Login page exposed: ${currentSecurity.exposeLoginPage}`,
              '',
              ...(!currentSession.active
                ? [
                    'Recommended flow:',
                    currentSecurity.exposeLoginPage
                      ? '1. Open `/login` and scan the QR code in the browser.'
                      : '1. Watch the server terminal and scan the printed QR code.',
                    '2. Confirm login in the mobile app.',
                    '3. After login succeeds, the session stays on the server and login tools are hidden.',
                  ]
                : currentSession.active
                  ? [
                      'A server-side session is already active.',
                      'Clients cannot read or pass the login cookie.',
                    ]
                  : [
                      'No login bootstrap is available.',
                    ]),
            ].join('\n'),
          },
        ],
      };
    },
  );

  server.registerResource(
    'ncm-method',
    new ResourceTemplate('ncm://methods/{name}', { list: undefined }),
    {
      mimeType: 'application/json',
    },
    async (_uri, variables) => {
      const name = variables.name;
      const method = typeof name === 'string' ? context.methodsByName.get(name) : undefined;
      const currentSecurity = loadSecurityConfig();

      if (!method || !isMethodAllowed(currentSecurity, method.name)) {
        throw new Error(`Unknown or disabled method: ${String(name)}`);
      }

      const resource = buildMethodResource(method);

      return {
        contents: [
          {
            uri: resource.uri,
            mimeType: 'application/json',
            text: resource.text,
          },
        ],
      };
    },
  );

  return server;
}
