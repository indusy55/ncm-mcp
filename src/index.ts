import express from 'express';
import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

import { createNcmMcpServer } from './mcp-server.js';
import { loadNcmApiContext } from './ncm-api.js';
import { isMethodAllowed, listAllowedTools, loadSecurityConfig } from './security.js';
import { getServerSessionSnapshot } from './server-session.js';
import { FEATURED_TOOLS } from './tool-catalog.js';

const host = process.env.HOST ?? '127.0.0.1';
const port = Number.parseInt(process.env.PORT ?? '3000', 10);

async function main(): Promise<void> {
  const context = await loadNcmApiContext();
  const security = loadSecurityConfig();
  const app = createMcpExpressApp({ host });

  app.use(express.json({ limit: '2mb' }));

  app.get('/', (_req, res) => {
    const availableMethods = context.methods.filter((method) =>
      isMethodAllowed(security, method.name),
    ).length;
    const serverSession = getServerSessionSnapshot();

    res.json({
      name: 'ncm-mcp',
      transport: 'streamable-http',
      endpoint: '/mcp',
      enableLoginBootstrap: security.enableLoginBootstrap,
      allowAuthenticatedReads: security.allowAuthenticatedReads,
      allowWriteTools: security.allowWriteTools,
      allowCookieAuth: security.allowCookieAuth,
      allowNetworkOverrides: security.allowNetworkOverrides,
      enableNcmCall: security.enableNcmCall,
      serverSession,
      loginGuide: 'ncm://login-guide',
      securityInfo: 'ncm://security',
      availableMethods,
      totalMethods: context.methods.length,
      featuredTools: listAllowedTools(security, [...FEATURED_TOOLS]),
    });
  });

  app.get('/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.post('/mcp', async (req, res) => {
    const server = createNcmMcpServer(context);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error('Failed to handle MCP request:', error);

      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Internal server error',
          },
          id: null,
        });
      }
    } finally {
      await transport.close().catch(() => undefined);
      await server.close().catch(() => undefined);
    }
  });

  const methodNotAllowed = (_req: express.Request, res: express.Response) => {
    res.status(405).json({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: 'Method not allowed.',
      },
      id: null,
    });
  };

  app.get('/mcp', methodNotAllowed);
  app.delete('/mcp', methodNotAllowed);

  app.listen(port, host, (error?: Error) => {
    if (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }

    console.log(`ncm-mcp listening on http://${host}:${port}/mcp`);
  });
}

main().catch((error) => {
  console.error('Failed to start ncm-mcp:', error);
  process.exit(1);
});
