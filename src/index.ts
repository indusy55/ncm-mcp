import express from 'express';
import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

import { createNcmMcpServer } from './mcp-server.js';
import { loadNcmApiContext } from './ncm-api.js';
import { loadSecurityConfig } from './security.js';

const host = process.env.HOST ?? '127.0.0.1';
const port = Number.parseInt(process.env.PORT ?? '3000', 10);

async function main(): Promise<void> {
  const context = await loadNcmApiContext();
  const security = loadSecurityConfig();
  const app = createMcpExpressApp({ host });

  app.use(express.json({ limit: '2mb' }));

  app.get('/', (_req, res) => {
    res.json({
      name: 'ncm-mcp',
      transport: 'streamable-http',
      endpoint: '/mcp',
      toolMode: security.toolMode,
      allowCookieAuth: security.allowCookieAuth,
      allowNetworkOverrides: security.allowNetworkOverrides,
      loginGuide: 'ncm://login-guide',
      securityInfo: 'ncm://security',
      methods: context.methods.length,
      featuredTools: [
        'ncm_search',
        'ncm_song_detail',
        'ncm_song_url',
        'ncm_lyric',
        'ncm_like_song',
        'ncm_liked_songs',
        'ncm_playlist_detail',
        'ncm_playlist_create',
        'ncm_playlist_delete',
        'ncm_playlist_name_update',
        'ncm_playlist_desc_update',
        'ncm_playlist_order_update',
        'ncm_playlist_subscribe',
        'ncm_playlist_tracks',
        'ncm_playlist_track_add',
        'ncm_playlist_track_delete',
        'ncm_playlist_categories',
        'ncm_top_playlist',
        'ncm_top_playlist_highquality',
        'ncm_album_detail',
        'ncm_artist_detail',
        'ncm_artist_songs',
        'ncm_artist_albums',
        'ncm_top_song',
        'ncm_mv_detail',
        'ncm_mv_url',
        'ncm_related_videos',
        'ncm_similar_songs',
        'ncm_similar_playlists',
        'ncm_similar_artists',
        'ncm_toplist',
        'ncm_toplist_detail',
        'ncm_recommended_playlists',
        'ncm_recommended_songs',
        'ncm_login_qr_key',
        'ncm_login_qr_create',
        'ncm_login_qr_check',
        'ncm_login_qr_start',
        'ncm_login_email',
        'ncm_login_cellphone',
        'ncm_captcha_send',
        'ncm_captcha_verify',
        'ncm_cellphone_existence_check',
        'ncm_login_status',
        'ncm_login_refresh',
        'ncm_logout',
        'ncm_user_account',
        'ncm_user_detail',
        'ncm_user_subcount',
        'ncm_user_playlists',
        'ncm_user_follows',
        'ncm_user_followeds',
        'ncm_user_record',
        'ncm_comment_music',
        'ncm_comment_playlist',
        'ncm_comment_album',
        'ncm_comment_mv',
        'ncm_comment_video',
        'ncm_list_methods',
        'ncm_describe_method',
        'ncm_call',
      ],
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
