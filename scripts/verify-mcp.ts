import { spawn } from 'node:child_process';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import {
  CallToolResultSchema,
  ListToolsResultSchema,
} from '@modelcontextprotocol/sdk/types.js';

const host = '127.0.0.1';
const port = 3100;
const serverUrl = `http://${host}:${port}/mcp`;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function waitForServer(url: string, attempts = 30): Promise<void> {
  for (let index = 0; index < attempts; index += 1) {
    try {
      const response = await fetch(`http://${host}:${port}/health`);
      if (response.ok) {
        return;
      }
    } catch {
      // ignore
    }

    await sleep(500);
  }

  throw new Error(`Server did not become ready: ${url}`);
}

async function runScenario(
  name: string,
  extraEnv: Record<string, string>,
): Promise<void> {
  const server = spawn(
    process.execPath,
    ['dist/index.js'],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        HOST: host,
        PORT: String(port),
        ...extraEnv,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );

  let closed = false;

  const cleanup = async (): Promise<void> => {
    if (closed) {
      return;
    }

    closed = true;
    server.kill();
    await sleep(300);
  };

  server.stdout.on('data', (chunk) => {
    process.stdout.write(`[server] ${chunk}`);
  });

  server.stderr.on('data', (chunk) => {
    process.stderr.write(`[server:err] ${chunk}`);
  });

  try {
    await waitForServer(serverUrl);

    const client = new Client(
      {
        name: 'ncm-mcp-verifier',
        version: '0.1.0',
      },
      {
        capabilities: {},
      },
    );

    const transport = new StreamableHTTPClientTransport(new URL(serverUrl));
    await client.connect(transport);

    const tools = await client.request(
      {
        method: 'tools/list',
        params: {},
      },
      ListToolsResultSchema,
    );

    console.log(
      JSON.stringify(
        {
          scenario: name,
          step: 'tools/list',
          count: tools.tools.length,
          sample: tools.tools.slice(0, 12).map((tool) => tool.name),
          hasLoginTool: tools.tools.some((tool) => tool.name === 'ncm_login_qr_start'),
          hasAuthReadTool: tools.tools.some((tool) => tool.name === 'ncm_liked_songs'),
          hasWriteTool: tools.tools.some((tool) => tool.name === 'ncm_playlist_create'),
          hasNcmCall: tools.tools.some((tool) => tool.name === 'ncm_call'),
        },
        null,
        2,
      ),
    );

    if (name === 'readonly-default') {
      if (tools.tools.some((tool) => tool.name === 'ncm_login_qr_start')) {
        throw new Error('readonly mode should not expose login tools');
      }

      if (tools.tools.some((tool) => tool.name === 'ncm_liked_songs')) {
        throw new Error('readonly mode should not expose authenticated read tools');
      }

      if (tools.tools.some((tool) => tool.name === 'ncm_playlist_create')) {
        throw new Error('readonly mode should not expose write tools');
      }

      if (tools.tools.some((tool) => tool.name === 'ncm_call')) {
        throw new Error('readonly mode should not expose ncm_call by default');
      }
    }

    if (name === 'login-bootstrap') {
      if (!tools.tools.some((tool) => tool.name === 'ncm_login_qr_start')) {
        throw new Error('login-bootstrap mode should expose login tools');
      }

      if (tools.tools.some((tool) => tool.name === 'ncm_liked_songs')) {
        throw new Error('login-bootstrap mode should not expose authenticated read tools');
      }

      if (tools.tools.some((tool) => tool.name === 'ncm_playlist_create')) {
        throw new Error('login-bootstrap mode should not expose write tools');
      }
    }

    if (name === 'server-session-readonly') {
      if (tools.tools.some((tool) => tool.name === 'ncm_login_qr_start')) {
        throw new Error('server-session mode should hide login tools');
      }

      if (!tools.tools.some((tool) => tool.name === 'ncm_liked_songs')) {
        throw new Error('server-session mode should expose authenticated read tools');
      }

      if (tools.tools.some((tool) => tool.name === 'ncm_playlist_create')) {
        throw new Error('server-session mode should not expose write tools');
      }
    }

    const searchResult = await client.request(
      {
        method: 'tools/call',
        params: {
          name: 'ncm_search',
          arguments: {
            keywords: '周杰伦',
            type: '1',
            limit: 3,
            offset: 0,
          },
        },
      },
      CallToolResultSchema,
    );

    console.log(
      JSON.stringify(
        {
          scenario: name,
          step: 'tools/call',
          tool: 'ncm_search',
          isError: searchResult.isError ?? false,
          contentTypes: searchResult.content.map((item) => item.type),
          structuredKeys: Object.keys(searchResult.structuredContent ?? {}),
          normalizedCount:
            (searchResult.structuredContent as { data?: { count?: number } } | undefined)
              ?.data?.count ?? null,
        },
        null,
        2,
      ),
    );

    await transport.close();
    await cleanup();
  } catch (error) {
    await cleanup();
    throw error;
  }
}

async function main(): Promise<void> {
  await runScenario('readonly-default', {
    NCM_ENABLE_NCM_CALL: 'false',
  });

  await runScenario('login-bootstrap', {
    NCM_ENABLE_LOGIN_BOOTSTRAP: 'true',
    NCM_ALLOW_AUTH_READS: 'false',
    NCM_ALLOW_WRITE_TOOLS: 'false',
    NCM_ENABLE_NCM_CALL: 'false',
  });

  await runScenario('server-session-readonly', {
    NETEASE_COOKIE: 'MUSIC_U=test-cookie; __csrf=test-csrf',
    NCM_ENABLE_LOGIN_BOOTSTRAP: 'true',
    NCM_ALLOW_AUTH_READS: 'true',
    NCM_ALLOW_WRITE_TOOLS: 'false',
    NCM_ENABLE_NCM_CALL: 'false',
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
