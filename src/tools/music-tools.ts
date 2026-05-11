import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { NcmApiContext } from '../ncm-api.js';
import type { SecurityConfig } from '../security.js';
import {
  normalizeAlbumDetailResult,
  normalizeArtistAlbumsResult,
  normalizeArtistDetailResult,
  normalizeArtistSongsResult,
  normalizeLikeListResult,
  normalizeLyricResult,
  normalizeMvDetailResult,
  normalizeMvUrlResult,
  normalizeMutationResult,
  normalizeSearchResult,
  normalizeSongDetailResult,
  normalizeSongUrlResult,
  normalizeTopSongResult,
  normalizeVideoListResult,
  normalizeRecommendedSongsResult,
  normalizeRecommendedPlaylistsResult,
  buildListData,
  normalizeArtist,
  normalizePlaylistListResult,
} from './normalizers.js';
import { asArray, callMethod, getBody } from './shared.js';
import {
  idSchema,
  paginationSchema,
  requestBaseSchema,
} from './tool-helpers.js';

export function registerMusicTools(
  server: McpServer,
  context: NcmApiContext,
  security: SecurityConfig,
): void {
  server.registerTool(
    'ncm_search',
    {
      description: 'Search songs, albums, artists, playlists, lyrics, users, MVs, DJs, or videos.',
      inputSchema: z.object({
        keywords: z.string().trim().min(1),
        type: z
          .enum([
            '1',
            '10',
            '100',
            '1000',
            '1002',
            '1004',
            '1006',
            '1009',
            '1014',
            '1018',
          ])
          .default('1'),
        limit: z.number().int().min(1).max(100).default(10),
        offset: z.number().int().min(0).default(0),
        ...requestBaseSchema,
      }),
    },
    async (input) => callMethod(context, security, 'cloudsearch', input, normalizeSearchResult),
  );

  server.registerTool(
    'ncm_song_detail',
    {
      description: 'Get song details by one or more song IDs.',
      inputSchema: z.object({
        ids: z
          .union([z.string().trim().min(1), z.array(idSchema).min(1)])
          .transform((value) => (Array.isArray(value) ? value.join(',') : value)),
        ...requestBaseSchema,
      }),
    },
    async (input) => callMethod(context, security, 'song_detail', input, normalizeSongDetailResult),
  );

  server.registerTool(
    'ncm_song_url',
    {
      description: 'Get song playback URL by song ID and quality level.',
      inputSchema: z.object({
        id: idSchema,
        level: z
          .enum([
            'standard',
            'exhigh',
            'lossless',
            'hires',
            'jyeffect',
            'jymaster',
            'sky',
          ])
          .default('standard'),
        ...requestBaseSchema,
      }),
    },
    async (input) => callMethod(context, security, 'song_url_v1', input, normalizeSongUrlResult),
  );

  server.registerTool(
    'ncm_lyric',
    {
      description: 'Get lyric content for one song.',
      inputSchema: z.object({
        id: idSchema,
        ...requestBaseSchema,
      }),
    },
    async (input) => callMethod(context, security, 'lyric', input, normalizeLyricResult),
  );

  server.registerTool(
    'ncm_like_song',
    {
      description: 'Like or unlike one song.',
      inputSchema: z.object({
        id: idSchema,
        like: z.boolean().default(true),
        alg: z.string().optional(),
        time: z.union([z.string(), z.number()]).optional(),
        ...requestBaseSchema,
      }),
    },
    async (input) => callMethod(context, security, 'like', input, normalizeMutationResult),
  );

  server.registerTool(
    'ncm_liked_songs',
    {
      description: 'Get liked song IDs for one user.',
      inputSchema: z.object({
        uid: idSchema,
        ...requestBaseSchema,
      }),
    },
    async (input) => callMethod(context, security, 'likelist', input, normalizeLikeListResult),
  );

  server.registerTool(
    'ncm_album_detail',
    {
      description: 'Get album detail by album ID.',
      inputSchema: z.object({
        id: idSchema,
        ...requestBaseSchema,
      }),
    },
    async (input) => callMethod(context, security, 'album', input, normalizeAlbumDetailResult),
  );

  server.registerTool(
    'ncm_artist_detail',
    {
      description: 'Get artist detail by artist ID.',
      inputSchema: z.object({
        id: idSchema,
        ...requestBaseSchema,
      }),
    },
    async (input) => callMethod(context, security, 'artist_detail', input, normalizeArtistDetailResult),
  );

  server.registerTool(
    'ncm_artist_songs',
    {
      description: 'Get songs for one artist.',
      inputSchema: z.object({
        id: idSchema,
        order: z.enum(['hot', 'time']).default('hot'),
        ...paginationSchema,
        ...requestBaseSchema,
      }),
    },
    async (input) => callMethod(context, security, 'artist_songs', input, normalizeArtistSongsResult),
  );

  server.registerTool(
    'ncm_artist_albums',
    {
      description: 'Get albums for one artist.',
      inputSchema: z.object({
        id: idSchema,
        ...paginationSchema,
        ...requestBaseSchema,
      }),
    },
    async (input) => callMethod(context, security, 'artist_album', input, normalizeArtistAlbumsResult),
  );

  server.registerTool(
    'ncm_top_song',
    {
      description: 'Get top songs by region.',
      inputSchema: z.object({
        type: z.enum(['0', '7', '96', '16', '8']).default('0'),
        ...requestBaseSchema,
      }),
    },
    async (input) => callMethod(context, security, 'top_song', input, normalizeTopSongResult),
  );

  server.registerTool(
    'ncm_mv_detail',
    {
      description: 'Get MV detail by MV ID.',
      inputSchema: z.object({
        mvid: idSchema,
        ...requestBaseSchema,
      }),
    },
    async (input) => callMethod(context, security, 'mv_detail', input, normalizeMvDetailResult),
  );

  server.registerTool(
    'ncm_mv_url',
    {
      description: 'Get MV playback URL.',
      inputSchema: z.object({
        id: idSchema,
        r: z.union([z.string(), z.number()]).optional(),
        ...requestBaseSchema,
      }),
    },
    async (input) => callMethod(context, security, 'mv_url', input, normalizeMvUrlResult),
  );

  server.registerTool(
    'ncm_related_videos',
    {
      description: 'Get related videos for one resource.',
      inputSchema: z.object({
        id: idSchema,
        ...requestBaseSchema,
      }),
    },
    async (input) => callMethod(context, security, 'related_allvideo', input, normalizeVideoListResult),
  );

  server.registerTool(
    'ncm_similar_songs',
    {
      description: 'Get similar songs.',
      inputSchema: z.object({
        id: idSchema,
        ...paginationSchema,
        ...requestBaseSchema,
      }),
    },
    async (input) => callMethod(context, security, 'simi_song', input, normalizeSongDetailResult),
  );

  server.registerTool(
    'ncm_similar_playlists',
    {
      description: 'Get similar playlists.',
      inputSchema: z.object({
        id: idSchema,
        ...paginationSchema,
        ...requestBaseSchema,
      }),
    },
    async (input) => callMethod(context, security, 'simi_playlist', input, normalizePlaylistListResult),
  );

  server.registerTool(
    'ncm_similar_artists',
    {
      description: 'Get similar artists.',
      inputSchema: z.object({
        id: idSchema,
        ...requestBaseSchema,
      }),
    },
    async (input) =>
      callMethod(context, security, 'simi_artist', input, (result) =>
        buildListData(asArray(getBody(result).artists), normalizeArtist),
      ),
  );

  server.registerTool(
    'ncm_recommended_playlists',
    {
      description: 'Get personalized playlist recommendations.',
      inputSchema: z.object({
        limit: z.number().int().min(1).max(100).default(10),
        ...requestBaseSchema,
      }),
    },
    async (input) => callMethod(context, security, 'personalized', input, normalizeRecommendedPlaylistsResult),
  );

  server.registerTool(
    'ncm_recommended_songs',
    {
      description: 'Get daily recommended songs for the current account.',
      inputSchema: z.object({
        ...requestBaseSchema,
      }),
    },
    async (input) => callMethod(context, security, 'recommend_songs', input, normalizeRecommendedSongsResult),
  );
}
