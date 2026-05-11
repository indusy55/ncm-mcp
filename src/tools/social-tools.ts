import { z } from 'zod';

import type { NcmApiContext } from '../ncm-api.js';
import type { SecurityConfig } from '../security.js';
import {
  normalizeCommentListResult,
  normalizeUserAccountResult,
  normalizeUserDetailResult,
  normalizeUserListResult,
  normalizeUserPlaylistResult,
  normalizeUserRecordResult,
  normalizeUserSubcountResult,
} from './normalizers.js';
import { callMethod } from './shared.js';
import type { ToolRegistrar } from './registrar.js';
import {
  commentPaginationSchema,
  idSchema,
  paginationSchema,
  requestBaseSchema,
} from './tool-helpers.js';

export function registerSocialTools(
  server: ToolRegistrar,
  context: NcmApiContext,
  security: SecurityConfig,
): void {
  server.registerTool(
    'ncm_user_account',
    {
      description: 'Get current account profile.',
      inputSchema: z.object({
        ...requestBaseSchema,
      }),
    },
    async (input) => callMethod(context, security, 'user_account', input, normalizeUserAccountResult),
  );

  server.registerTool(
    'ncm_user_detail',
    {
      description: 'Get profile detail for one user.',
      inputSchema: z.object({
        uid: idSchema,
        ...requestBaseSchema,
      }),
    },
    async (input) => callMethod(context, security, 'user_detail', input, normalizeUserDetailResult),
  );

  server.registerTool(
    'ncm_user_subcount',
    {
      description: 'Get current account subscription counts.',
      inputSchema: z.object({
        ...requestBaseSchema,
      }),
    },
    async (input) => callMethod(context, security, 'user_subcount', input, normalizeUserSubcountResult),
  );

  server.registerTool(
    'ncm_user_playlists',
    {
      description: 'Get playlists for one user.',
      inputSchema: z.object({
        uid: idSchema,
        ...paginationSchema,
        ...requestBaseSchema,
      }),
    },
    async (input) => callMethod(context, security, 'user_playlist', input, normalizeUserPlaylistResult),
  );

  server.registerTool(
    'ncm_user_follows',
    {
      description: 'Get accounts that one user follows.',
      inputSchema: z.object({
        uid: idSchema,
        ...paginationSchema,
        ...requestBaseSchema,
      }),
    },
    async (input) =>
      callMethod(context, security, 'user_follows', input, (result) =>
        normalizeUserListResult(result, 'follow'),
      ),
  );

  server.registerTool(
    'ncm_user_followeds',
    {
      description: 'Get followers of one user.',
      inputSchema: z.object({
        uid: idSchema,
        limit: z.number().int().min(1).max(1000).default(30),
        lasttime: z.union([z.string(), z.number()]).optional(),
        ...requestBaseSchema,
      }),
    },
    async (input) =>
      callMethod(context, security, 'user_followeds', input, (result) =>
        normalizeUserListResult(result, 'followeds'),
      ),
  );

  server.registerTool(
    'ncm_user_record',
    {
      description: 'Get user listening history.',
      inputSchema: z.object({
        uid: idSchema,
        type: z.enum(['0', '1']).default('0'),
        ...requestBaseSchema,
      }),
    },
    async (input) => callMethod(context, security, 'user_record', input, normalizeUserRecordResult),
  );

  server.registerTool(
    'ncm_comment_music',
    {
      description: 'Get comments for one song.',
      inputSchema: z.object({
        id: idSchema,
        ...commentPaginationSchema,
        ...requestBaseSchema,
      }),
    },
    async (input) => callMethod(context, security, 'comment_music', input, normalizeCommentListResult),
  );

  server.registerTool(
    'ncm_comment_playlist',
    {
      description: 'Get comments for one playlist.',
      inputSchema: z.object({
        id: idSchema,
        ...commentPaginationSchema,
        ...requestBaseSchema,
      }),
    },
    async (input) => callMethod(context, security, 'comment_playlist', input, normalizeCommentListResult),
  );

  server.registerTool(
    'ncm_comment_album',
    {
      description: 'Get comments for one album.',
      inputSchema: z.object({
        id: idSchema,
        ...commentPaginationSchema,
        ...requestBaseSchema,
      }),
    },
    async (input) => callMethod(context, security, 'comment_album', input, normalizeCommentListResult),
  );

  server.registerTool(
    'ncm_comment_mv',
    {
      description: 'Get comments for one MV.',
      inputSchema: z.object({
        id: idSchema,
        ...commentPaginationSchema,
        ...requestBaseSchema,
      }),
    },
    async (input) => callMethod(context, security, 'comment_mv', input, normalizeCommentListResult),
  );

  server.registerTool(
    'ncm_comment_video',
    {
      description: 'Get comments for one video.',
      inputSchema: z.object({
        id: idSchema,
        ...commentPaginationSchema,
        ...requestBaseSchema,
      }),
    },
    async (input) => callMethod(context, security, 'comment_video', input, normalizeCommentListResult),
  );
}
