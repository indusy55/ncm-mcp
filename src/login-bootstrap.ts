import QRCode from 'qrcode';

import type { NcmApiContext } from './ncm-api.js';
import { normalizeToolError } from './ncm-api.js';
import {
  getServerSessionSnapshot,
  setServerSessionCookie,
} from './server-session.js';

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return undefined;
  }

  return value as UnknownRecord;
}

function getBody(result: unknown): UnknownRecord {
  const record = asRecord(result);
  return asRecord(record?.body) ?? {};
}

function getQrData(result: unknown): UnknownRecord {
  const body = getBody(result);
  return asRecord(body.data) ?? body;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const QR_REFRESH_INTERVAL_MS = 60_000;
const QR_IDLE_LIMIT = 5;
const QR_POLL_INTERVAL_MS = 2_000;
const QR_CONFIRM_POLL_INTERVAL_MS = 1_500;

async function createTerminalQrLogin(
  context: NcmApiContext,
): Promise<{ key: string; qrurl: string; terminalQr: string } | undefined> {
  const keyResult = await context.api.login_qr_key({});
  const key = getQrData(keyResult).unikey;

  if (typeof key !== 'string' || !key.trim()) {
    console.warn('Failed to get QR login key for terminal bootstrap.');
    return undefined;
  }

  const qrResult = await context.api.login_qr_create({
    key,
    qrimg: true,
  });
  const body = getQrData(qrResult);
  const qrurl = typeof body.qrurl === 'string' ? body.qrurl : '';

  if (!qrurl) {
    console.warn('Failed to get QR login URL for terminal bootstrap.');
    return undefined;
  }

  const terminalQr = await QRCode.toString(qrurl, {
    type: 'terminal',
    small: true,
  });

  return { key, qrurl, terminalQr };
}

export async function bootstrapTerminalQrLogin(
  context: NcmApiContext,
): Promise<void> {
  if (getServerSessionSnapshot().active) {
    return;
  }

  try {
    let idleRounds = 0;

    while (!getServerSessionSnapshot().active && idleRounds < QR_IDLE_LIMIT) {
      const login = await createTerminalQrLogin(context);
      if (!login) {
        return;
      }

      console.log('');
      console.log(
        `NCM login required. Scan this QR code in the Netease Cloud Music app. Refresh ${idleRounds + 1}/${QR_IDLE_LIMIT}:`,
      );
      console.log('');
      console.log(login.terminalQr);
      console.log(`QR URL: ${login.qrurl}`);
      console.log('');

      let lastCode: unknown;
      let sawScan = false;
      const startedAt = Date.now();

      while (!getServerSessionSnapshot().active) {
        const checkResult = await context.api.login_qr_check({ key: login.key });
        const checkBody = getBody(checkResult);
        const code = checkBody.code;
        const cookie =
          typeof checkBody.cookie === 'string' ? checkBody.cookie.trim() : '';

        if (code !== lastCode) {
          lastCode = code;

          if (code === 801) {
            console.log('Waiting for QR scan...');
          } else if (code === 802) {
            sawScan = true;
            console.log('QR scanned. Waiting for confirmation in app...');
          } else if (code === 800) {
            console.log('QR expired before login completed.');
            break;
          }
        }

        if (code === 803 && cookie) {
          setServerSessionCookie(cookie, 'qr');
          console.log('NCM login succeeded. Server session is now active.');
          break;
        }

        if (!sawScan && Date.now() - startedAt >= QR_REFRESH_INTERVAL_MS) {
          idleRounds += 1;
          console.log(
            idleRounds >= QR_IDLE_LIMIT
              ? 'QR was not scanned after 5 refreshes. Stopping terminal login bootstrap.'
              : 'QR was not scanned within 1 minute. Refreshing QR code...',
          );
          break;
        }

        await sleep(
          code === 802 ? QR_CONFIRM_POLL_INTERVAL_MS : QR_POLL_INTERVAL_MS,
        );
      }

      if (getServerSessionSnapshot().active) {
        break;
      }

      if (sawScan) {
        idleRounds = 0;
      }
    }
  } catch (error) {
    const normalized = normalizeToolError(error);
    console.warn('Terminal QR login bootstrap failed:', normalized.message);
  }
}
