import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import {
  normalizeKnownMethodResult,
  registerAllTools,
} from './tools/index.js';
import type { NcmApiContext, NcmMethodMeta } from './ncm-api.js';
import { normalizeToolError } from './ncm-api.js';
import {
  isMethodAllowed,
  isToolAllowed,
  loadSecurityConfig,
  sanitizeMethodParams,
} from './security.js';
import { getServerSessionSnapshot } from './server-session.js';

type UnknownRecord = Record<string, unknown>;

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
  const session = getServerSessionSnapshot();
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
      const filtered = keyword
        ? context.methods.filter(
            (method) =>
              method.name.includes(keyword) || method.route.includes(keyword),
          )
        : context.methods;

      const allowed = filtered.filter((method) =>
        isMethodAllowed(security, method.name),
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
      const found = context.methodsByName.get(method);

      if (!found || !isMethodAllowed(security, found.name)) {
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

  if (isToolAllowed(security, 'ncm_call')) {
    server.registerTool(
      'ncm_call',
      {
        description:
          'Call one @neteasecloudmusicapienhanced/api method. All fields except method are forwarded as params.',
        inputSchema: z.object({
          method: z.string().trim().min(1),
        }).passthrough(),
      },
      async (input) => {
        const { method, ...params } = input as { method: string } & UnknownRecord;
        if (!isMethodAllowed(security, method)) {
          return {
            isError: true,
            content: [
              {
                type: 'text',
                text: `Method is disabled by server policy: ${method}`,
              },
            ],
            structuredContent: {
              method,
              policyDenied: true,
            },
          };
        }

        const sanitized = sanitizeMethodParams(security, params);
        if (!sanitized.ok) {
          return {
            isError: true,
            content: [
              {
                type: 'text',
                text: sanitized.message,
              },
            ],
            structuredContent: {
              method,
              policyDenied: true,
            },
          };
        }

        const fn = context.api[method];

        if (!fn) {
          return {
            isError: true,
            content: [
              {
                type: 'text',
                text: `Unknown method: ${method}`,
              },
            ],
            structuredContent: {
              method,
              available: false,
            },
          };
        }

        try {
          const result = await fn(params);

          return {
            content: [
              {
                type: 'text',
                text: toPrettyJson(result),
              },
            ],
            structuredContent: {
              method,
              params,
              data: normalizeKnownMethodResult(method, result, params),
              result: result as UnknownRecord,
            },
          };
        } catch (error) {
          const normalized = normalizeToolError(error);

          return {
            isError: true,
            content: [
              {
                type: 'text',
                text: normalized.message,
              },
            ],
            structuredContent: {
              method,
              params,
              error: normalized,
            },
          };
        }
      },
    );
  }

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
              isMethodAllowed(security, method.name),
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
    async () => ({
      contents: [
        {
          uri: 'ncm://security',
          mimeType: 'application/json',
          text: toPrettyJson({
            enableLoginBootstrap: security.enableLoginBootstrap,
            allowAuthenticatedReads: security.allowAuthenticatedReads,
            allowWriteTools: security.allowWriteTools,
            allowCookieAuth: security.allowCookieAuth,
            allowNetworkOverrides: security.allowNetworkOverrides,
            enableNcmCall: security.enableNcmCall,
            serverSession: session,
            allowedTools:
              security.allowedTools === null
                ? null
                : Array.from(security.allowedTools),
          }),
        },
      ],
    }),
  );

  server.registerResource(
    'ncm-login-guide',
    'ncm://login-guide',
    {
      mimeType: 'application/markdown',
    },
    async () => ({
      contents: [
        {
          uri: 'ncm://login-guide',
          mimeType: 'application/markdown',
          text: [
            '# Login Guide',
            '',
            `Server session active: ${session.active}`,
            `Authenticated reads enabled: ${security.allowAuthenticatedReads}`,
            `Write tools enabled: ${security.allowWriteTools}`,
            '',
            ...(security.enableLoginBootstrap && !session.active
              ? [
                  'Recommended flow:',
                  '1. Use `ncm_login_qr_start` to get QR login data.',
                  '2. Poll with `ncm_login_qr_check` until login succeeds.',
                  '3. After login succeeds, the session stays on the server and login tools are hidden.',
                ]
              : session.active
                ? [
                    'A server-side session is already active.',
                    'Clients cannot read or pass the login cookie.',
                  ]
              : [
                  'Login bootstrap tools are not exposed in the current mode.',
                  'Set `NCM_ENABLE_LOGIN_BOOTSTRAP=true` to enable QR login bootstrap.',
                ]),
            '',
            security.allowCookieAuth
              ? 'Per-request cookie passthrough is enabled.'
              : 'Per-request cookie passthrough is disabled by default.',
            security.allowNetworkOverrides
              ? 'Network override params are enabled.'
              : 'Network override params such as proxy and realIP are disabled by default.',
          ].join('\n'),
        },
      ],
    }),
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

      if (!method || !isMethodAllowed(security, method.name)) {
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
