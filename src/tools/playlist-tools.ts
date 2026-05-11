import { z } from 'zod';

import type { NcmApiContext } from '../ncm-api.js';
import type { SecurityConfig } from '../security.js';
import {
  normalizeMutationResult,
  normalizePlaylistCategoriesResult,
  normalizePlaylistCreateResult,
  normalizePlaylistDetailResult,
  normalizePlaylistListResult,
  normalizePlaylistTracksResult,
  normalizeToplistResult,
} from './normalizers.js';
import { callMethod } from './shared.js';
import type { ToolRegistrar } from './registrar.js';
import {
  commaSeparatedIdsSchema,
  idSchema,
  paginationSchema,
  requestBaseSchema,
} from './tool-helpers.js';

export function registerPlaylistTools(
  server: ToolRegistrar,
  context: NcmApiContext,
  security: SecurityConfig,
): void {
  server.registerTool(
    'ncm_playlist_detail',
    {
      description: 'Get playlist detail by playlist ID.',
      inputSchema: z.object({
        id: idSchema,
        s: z.union([z.string(), z.number()]).optional(),
        ...requestBaseSchema,
      }),
    },
    async (input) => callMethod(context, security, 'playlist_detail', input, normalizePlaylistDetailResult),
  );

  server.registerTool(
    'ncm_playlist_create',
    {
      description: 'Create a playlist.',
      inputSchema: z.object({
        name: z.string().trim().min(1),
        privacy: z.enum(['0', '10']).default('0').transform((value) => Number(value) as 0 | 10),
        type: z.string().optional(),
        ...requestBaseSchema,
      }),
    },
    async (input) => callMethod(context, security, 'playlist_create', input, normalizePlaylistCreateResult),
  );

  server.registerTool(
    'ncm_playlist_delete',
    {
      description: 'Delete a playlist.',
      inputSchema: z.object({
        id: idSchema,
        ...requestBaseSchema,
      }),
    },
    async (input) => callMethod(context, security, 'playlist_delete', input, normalizeMutationResult),
  );

  server.registerTool(
    'ncm_playlist_name_update',
    {
      description: 'Update playlist name.',
      inputSchema: z.object({
        id: idSchema,
        name: z.string().trim().min(1),
        ...requestBaseSchema,
      }),
    },
    async (input) => callMethod(context, security, 'playlist_name_update', input, normalizeMutationResult),
  );

  server.registerTool(
    'ncm_playlist_desc_update',
    {
      description: 'Update playlist description.',
      inputSchema: z.object({
        id: idSchema,
        desc: z.string(),
        ...requestBaseSchema,
      }),
    },
    async (input) => callMethod(context, security, 'playlist_desc_update', input, normalizeMutationResult),
  );

  server.registerTool(
    'ncm_playlist_order_update',
    {
      description: 'Update playlist order for current account.',
      inputSchema: z.object({
        ids: commaSeparatedIdsSchema,
        ...requestBaseSchema,
      }),
    },
    async (input) => callMethod(context, security, 'playlist_order_update', input, normalizeMutationResult),
  );

  server.registerTool(
    'ncm_playlist_subscribe',
    {
      description: 'Subscribe or unsubscribe one playlist.',
      inputSchema: z.object({
        id: idSchema,
        t: z.enum(['1', '0']).transform((value) => Number(value) as 1 | 0),
        ...requestBaseSchema,
      }),
    },
    async (input) => callMethod(context, security, 'playlist_subscribe', input, normalizeMutationResult),
  );

  server.registerTool(
    'ncm_playlist_tracks',
    {
      description: 'Get all tracks from one playlist.',
      inputSchema: z.object({
        id: idSchema,
        s: z.union([z.string(), z.number()]).optional(),
        ...paginationSchema,
        ...requestBaseSchema,
      }),
    },
    async (input) => callMethod(context, security, 'playlist_track_all', input, normalizePlaylistTracksResult),
  );

  server.registerTool(
    'ncm_playlist_track_add',
    {
      description: 'Add songs to one playlist.',
      inputSchema: z.object({
        pid: idSchema,
        ids: commaSeparatedIdsSchema,
        ...requestBaseSchema,
      }),
    },
    async (input) => callMethod(context, security, 'playlist_track_add', input, normalizeMutationResult),
  );

  server.registerTool(
    'ncm_playlist_track_delete',
    {
      description: 'Delete songs from one playlist.',
      inputSchema: z.object({
        pid: idSchema,
        ids: commaSeparatedIdsSchema,
        ...requestBaseSchema,
      }),
    },
    async (input) => callMethod(context, security, 'playlist_track_delete', input, normalizeMutationResult),
  );

  server.registerTool(
    'ncm_playlist_categories',
    {
      description: 'Get playlist category list.',
      inputSchema: z.object({
        ...requestBaseSchema,
      }),
    },
    async (input) => callMethod(context, security, 'playlist_catlist', input, normalizePlaylistCategoriesResult),
  );

  server.registerTool(
    'ncm_top_playlist',
    {
      description: 'Get playlists by category and order.',
      inputSchema: z.object({
        cat: z.string().optional(),
        order: z.enum(['hot', 'new']).default('hot'),
        ...paginationSchema,
        ...requestBaseSchema,
      }),
    },
    async (input) => callMethod(context, security, 'top_playlist', input, normalizePlaylistListResult),
  );

  server.registerTool(
    'ncm_top_playlist_highquality',
    {
      description: 'Get high-quality playlists by category.',
      inputSchema: z.object({
        cat: z.string().optional(),
        before: z.union([z.string(), z.number()]).optional(),
        limit: z.number().int().min(1).max(100).default(20),
        ...requestBaseSchema,
      }),
    },
    async (input) => callMethod(context, security, 'top_playlist_highquality', input, normalizePlaylistListResult),
  );

  server.registerTool(
    'ncm_toplist',
    {
      description: 'Get toplist summary.',
      inputSchema: z.object({
        ...requestBaseSchema,
      }),
    },
    async (input) => callMethod(context, security, 'toplist', input, normalizeToplistResult),
  );

  server.registerTool(
    'ncm_toplist_detail',
    {
      description: 'Get detailed toplist data.',
      inputSchema: z.object({
        ...requestBaseSchema,
      }),
    },
    async (input) => callMethod(context, security, 'toplist_detail', input, normalizeToplistResult),
  );
}
