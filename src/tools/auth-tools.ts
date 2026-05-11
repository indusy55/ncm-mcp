import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { NcmApiContext } from '../ncm-api.js';
import type { SecurityConfig } from '../security.js';
import {
  normalizeLoginStatusResult,
  normalizeMutationResult,
} from './normalizers.js';
import { callMethod } from './shared.js';
import { idSchema, requestBaseSchema } from './tool-helpers.js';

export function registerAuthTools(
  server: McpServer,
  context: NcmApiContext,
  security: SecurityConfig,
): void {
  server.registerTool(
    'ncm_login_qr_key',
    {
      description: 'Create a QR login key.',
      inputSchema: z.object({
        ...requestBaseSchema,
      }),
    },
    async (input) => callMethod(context, security, 'login_qr_key', input),
  );

  server.registerTool(
    'ncm_login_qr_create',
    {
      description: 'Create QR login content from a QR key.',
      inputSchema: z.object({
        key: idSchema,
        qrimg: z.boolean().default(true),
        ...requestBaseSchema,
      }),
    },
    async (input) => callMethod(context, security, 'login_qr_create', input),
  );

  server.registerTool(
    'ncm_login_qr_check',
    {
      description: 'Check QR login status by QR key.',
      inputSchema: z.object({
        key: idSchema,
        ...requestBaseSchema,
      }),
    },
    async (input) => callMethod(context, security, 'login_qr_check', input),
  );

  server.registerTool(
    'ncm_login_qr_start',
    {
      description: 'Create QR login key and QR content in one step.',
      inputSchema: z.object({
        qrimg: z.boolean().default(true),
        ...requestBaseSchema,
      }),
    },
    async ({ qrimg, ...rest }) => {
      const keyResult = await callMethod(context, security, 'login_qr_key', rest);
      const body = (
        keyResult.structuredContent?.result as
          | { body?: Record<string, unknown> }
          | undefined
      )?.body;
      const unikey = body?.unikey;

      if (!unikey) {
        return keyResult;
      }

      return callMethod(context, security, 'login_qr_create', {
        key: unikey,
        qrimg,
        ...rest,
      });
    },
  );

  server.registerTool(
    'ncm_login_email',
    {
      description: 'Login with email and password.',
      inputSchema: z.object({
        email: z.string().trim().min(1),
        password: z.string().min(1).optional(),
        md5_password: z.string().min(1).optional(),
        ...requestBaseSchema,
      }).refine(
        (input) => Boolean(input.password || input.md5_password),
        {
          message: 'password or md5_password is required',
          path: ['password'],
        },
      ),
    },
    async (input) => callMethod(context, security, 'login', input, normalizeLoginStatusResult),
  );

  server.registerTool(
    'ncm_login_cellphone',
    {
      description: 'Login with cellphone and password or captcha.',
      inputSchema: z.object({
        phone: z.union([z.string(), z.number()]),
        countrycode: z.union([z.string(), z.number()]).optional(),
        password: z.string().min(1).optional(),
        md5_password: z.string().min(1).optional(),
        captcha: z.union([z.string(), z.number()]).optional(),
        ...requestBaseSchema,
      }).refine(
        (input) =>
          Boolean(input.password || input.md5_password || input.captcha),
        {
          message: 'password, md5_password, or captcha is required',
          path: ['password'],
        },
      ),
    },
    async (input) =>
      callMethod(context, security, 'login_cellphone', input, normalizeLoginStatusResult),
  );

  server.registerTool(
    'ncm_captcha_send',
    {
      description: 'Send login captcha to cellphone.',
      inputSchema: z.object({
        phone: z.string().trim().min(1),
        ctcode: z.union([z.string(), z.number()]).optional(),
        ...requestBaseSchema,
      }),
    },
    async (input) => callMethod(context, security, 'captcha_sent', input, normalizeMutationResult),
  );

  server.registerTool(
    'ncm_captcha_verify',
    {
      description: 'Verify cellphone captcha.',
      inputSchema: z.object({
        phone: z.union([z.string(), z.number()]),
        captcha: z.string().trim().min(1),
        ctcode: z.union([z.string(), z.number()]).optional(),
        ...requestBaseSchema,
      }),
    },
    async (input) => callMethod(context, security, 'captcha_verify', input, normalizeMutationResult),
  );

  server.registerTool(
    'ncm_cellphone_existence_check',
    {
      description: 'Check whether a cellphone number exists.',
      inputSchema: z.object({
        phone: z.union([z.string(), z.number()]),
        countrycode: z.union([z.string(), z.number()]),
        ...requestBaseSchema,
      }),
    },
    async (input) =>
      callMethod(context, security, 'cellphone_existence_check', input, normalizeMutationResult),
  );

  server.registerTool(
    'ncm_login_status',
    {
      description: 'Get current login status.',
      inputSchema: z.object({
        ...requestBaseSchema,
      }),
    },
    async (input) => callMethod(context, security, 'login_status', input, normalizeLoginStatusResult),
  );

  server.registerTool(
    'ncm_login_refresh',
    {
      description: 'Refresh current login state.',
      inputSchema: z.object({
        ...requestBaseSchema,
      }),
    },
    async (input) => callMethod(context, security, 'login_refresh', input, normalizeMutationResult),
  );

  server.registerTool(
    'ncm_logout',
    {
      description: 'Logout current account.',
      inputSchema: z.object({
        ...requestBaseSchema,
      }),
    },
    async (input) => callMethod(context, security, 'logout', input, normalizeMutationResult),
  );
}
