import { z } from 'zod';

import type { NcmApiContext } from '../ncm-api.js';
import type { SecurityConfig } from '../security.js';
import type { ToolRegistrar } from './registrar.js';
import { asRecord, callMethod, getBody, toPrettyJson } from './shared.js';
import { setServerSessionCookie } from '../server-session.js';
import { idSchema } from './tool-helpers.js';

function getQrData(result: unknown): Record<string, unknown> {
  const body = getBody(result);
  return asRecord(body.data) ?? body;
}

export function registerAuthTools(
  server: ToolRegistrar,
  context: NcmApiContext,
  security: SecurityConfig,
): void {
  server.registerTool(
    'ncm_login_qr_check',
    {
      description: 'Check QR login status by QR key.',
      inputSchema: z.object({
        key: idSchema,
      }),
    },
    async (input) => {
      const result = await callMethod(
        context,
        security,
        'login_qr_check',
        input,
      );
      const body = getBody(result.structuredContent?.result);
      const code = body.code;
      const cookie =
        typeof body.cookie === 'string' ? body.cookie.trim() : '';

      if (code === 803 && cookie) {
        setServerSessionCookie(cookie, 'qr');

        return {
          content: [
            {
              type: 'text',
              text: toPrettyJson({
                code,
                message: 'Login succeeded. Session is now stored on the server.',
              }),
            },
          ],
          structuredContent: {
            method: 'login_qr_check',
            data: {
              code,
              authorized: true,
              sessionStored: true,
            },
            result: result.structuredContent?.result,
          },
        };
      }

      return result;
    },
  );

  server.registerTool(
    'ncm_login_qr_start',
    {
      description: 'Create QR login key and QR content in one step.',
      inputSchema: z.object({
        qrimg: z.boolean().default(true),
      }),
    },
    async ({ qrimg, ...rest }) => {
      const keyResult = await callMethod(context, security, 'login_qr_key', rest);
      const unikey = getQrData(keyResult.structuredContent?.result).unikey;

      if (!unikey) {
        return keyResult;
      }

      const qrResult = await callMethod(context, security, 'login_qr_create', {
        key: unikey,
        qrimg,
        ...rest,
      });

      if (qrResult.isError) {
        return qrResult;
      }

      const qrBody = getQrData(qrResult.structuredContent?.result);
      const data = {
        key: unikey,
        qrurl: qrBody.qrurl,
        qrimg: qrBody.qrimg,
      };

      return {
        content: [
          {
            type: 'text',
            text: toPrettyJson({
              key: unikey,
              result: qrResult.structuredContent?.result,
            }),
          },
        ],
        structuredContent: {
          method: 'login_qr_start',
          data,
          result: qrResult.structuredContent?.result,
        },
      };
    },
  );
}
