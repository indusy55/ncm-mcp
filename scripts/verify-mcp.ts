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

async function main(): Promise<void> {
  const server = spawn(
    process.execPath,
    ['dist/index.js'],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        HOST: host,
        PORT: String(port),
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
          step: 'tools/list',
          count: tools.tools.length,
          sample: tools.tools.slice(0, 12).map((tool) => tool.name),
        },
        null,
        2,
      ),
    );

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

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
