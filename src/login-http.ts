import type express from 'express';

import type { NcmApiContext } from './ncm-api.js';
import { normalizeToolError } from './ncm-api.js';
import { loadSecurityConfig } from './security.js';
import {
  getServerSessionSnapshot,
  setServerSessionCookie,
} from './server-session.js';
import { redactSensitiveValue } from './tools/shared.js';

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

function renderLoginPage(): string {
  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>NCM Server Login</title>
    <style>
      :root {
        color-scheme: light;
        --bg: #f3efe6;
        --panel: rgba(255, 252, 245, 0.92);
        --text: #1b1a17;
        --muted: #6b665c;
        --line: rgba(27, 26, 23, 0.12);
        --accent: #bf3b2b;
        --accent-2: #1d5f5a;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: "Iowan Old Style", "Source Han Serif SC", "Noto Serif SC", serif;
        color: var(--text);
        background:
          radial-gradient(circle at top left, rgba(191, 59, 43, 0.18), transparent 28%),
          radial-gradient(circle at right, rgba(29, 95, 90, 0.18), transparent 24%),
          linear-gradient(135deg, #f7f1e5, #ece7dc 50%, #f5f3ed);
        min-height: 100vh;
      }
      main {
        width: min(960px, calc(100vw - 32px));
        margin: 32px auto;
        display: grid;
        grid-template-columns: 1.1fr 0.9fr;
        gap: 20px;
      }
      .card {
        background: var(--panel);
        border: 1px solid var(--line);
        border-radius: 24px;
        padding: 28px;
        backdrop-filter: blur(12px);
        box-shadow: 0 20px 60px rgba(45, 38, 27, 0.08);
      }
      h1, h2, p { margin: 0; }
      h1 {
        font-size: clamp(32px, 5vw, 56px);
        line-height: 0.98;
        letter-spacing: -0.04em;
        margin-bottom: 16px;
      }
      .lead {
        font-size: 17px;
        line-height: 1.7;
        color: var(--muted);
        max-width: 34rem;
      }
      .badge {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 18px;
        padding: 8px 12px;
        border-radius: 999px;
        background: rgba(255,255,255,0.7);
        border: 1px solid var(--line);
        font-size: 13px;
      }
      .dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: var(--accent-2);
      }
      .actions {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
        margin-top: 24px;
      }
      button {
        appearance: none;
        border: 0;
        border-radius: 999px;
        padding: 12px 18px;
        font: inherit;
        cursor: pointer;
        background: var(--accent);
        color: white;
      }
      button.secondary {
        background: transparent;
        color: var(--text);
        border: 1px solid var(--line);
      }
      .qr-shell {
        display: grid;
        place-items: center;
        min-height: 420px;
      }
      .qr-box {
        width: min(100%, 360px);
        border-radius: 24px;
        background: white;
        border: 1px solid rgba(0,0,0,0.06);
        padding: 20px;
        text-align: center;
      }
      .qr-box img {
        width: 100%;
        height: auto;
        display: block;
      }
      .status {
        margin-top: 16px;
        font-size: 15px;
        color: var(--muted);
        min-height: 24px;
      }
      .meta {
        margin-top: 12px;
        padding-top: 12px;
        border-top: 1px dashed var(--line);
        text-align: left;
        font-size: 13px;
        color: var(--muted);
        word-break: break-all;
      }
      .hidden { display: none; }
      .ok { color: var(--accent-2); }
      .warn { color: var(--accent); }
      @media (max-width: 820px) {
        main { grid-template-columns: 1fr; }
        .qr-shell { min-height: auto; }
      }
    </style>
  </head>
  <body>
    <main>
      <section class="card">
        <div class="badge"><span class="dot"></span><span>Server-side QR login</span></div>
        <h1>扫码后，登录态只留在服务端。</h1>
        <p class="lead">这个页面适合部署后的远程服务使用。浏览器只负责展示二维码和轮询状态，网易云登录 cookie 会直接写入服务器会话，不回传给客户端。</p>
        <div class="actions">
          <button id="start">生成二维码</button>
          <button id="refresh" class="secondary hidden">重新生成</button>
        </div>
        <div class="actions">
          <button id="check-session" class="secondary">查看当前会话状态</button>
        </div>
      </section>
      <section class="card qr-shell">
        <div class="qr-box">
          <div id="placeholder">点击“生成二维码”开始登录。</div>
          <img id="qrimg" class="hidden" alt="Netease login QR code" />
          <div id="status" class="status"></div>
          <div id="meta" class="meta hidden"></div>
        </div>
      </section>
    </main>
    <script>
      const startButton = document.getElementById('start');
      const refreshButton = document.getElementById('refresh');
      const checkSessionButton = document.getElementById('check-session');
      const placeholder = document.getElementById('placeholder');
      const qrimg = document.getElementById('qrimg');
      const status = document.getElementById('status');
      const meta = document.getElementById('meta');

      let currentKey = '';
      let timer = undefined;

      function setStatus(text, kind) {
        status.textContent = text;
        status.className = 'status' + (kind ? ' ' + kind : '');
      }

      function setMeta(text) {
        if (!text) {
          meta.textContent = '';
          meta.classList.add('hidden');
          return;
        }

        meta.textContent = text;
        meta.classList.remove('hidden');
      }

      function stopPolling() {
        if (timer) {
          clearTimeout(timer);
          timer = undefined;
        }
      }

      async function showSession() {
        const res = await fetch('/login/session');
        const data = await res.json();
        const stamp = data.updatedAt ? '，更新时间 ' + data.updatedAt : '';
        setStatus(data.active ? '服务端会话已激活' + stamp : '服务端当前没有登录态', data.active ? 'ok' : '');
        setMeta(JSON.stringify(data, null, 2));
      }

      async function poll() {
        if (!currentKey) {
          return;
        }

        const res = await fetch('/login/check?key=' + encodeURIComponent(currentKey));
        const data = await res.json();

        if (!res.ok) {
          setStatus(data.message || '登录状态查询失败', 'warn');
          setMeta(JSON.stringify(data, null, 2));
          return;
        }

        const code = data.code;
        if (code === 801) {
          setStatus('等待扫码');
          timer = setTimeout(poll, 2000);
          return;
        }

        if (code === 802) {
          setStatus('已扫码，请在手机上确认', 'ok');
          timer = setTimeout(poll, 1500);
          return;
        }

        if (code === 803) {
          setStatus('登录成功，服务端会话已保存', 'ok');
          setMeta(JSON.stringify(data, null, 2));
          stopPolling();
          return;
        }

        if (code === 800) {
          setStatus('二维码已过期，请重新生成', 'warn');
          setMeta(JSON.stringify(data, null, 2));
          stopPolling();
          return;
        }

        setStatus('收到未知登录状态: ' + code, 'warn');
        setMeta(JSON.stringify(data, null, 2));
        timer = setTimeout(poll, 2500);
      }

      async function startLogin() {
        stopPolling();
        setStatus('正在生成二维码...');
        setMeta('');

        const res = await fetch('/login/start', { method: 'POST' });
        const data = await res.json();

        if (!res.ok) {
          setStatus(data.message || '二维码生成失败', 'warn');
          setMeta(JSON.stringify(data, null, 2));
          return;
        }

        currentKey = data.key || '';
        placeholder.classList.add('hidden');
        qrimg.classList.remove('hidden');
        qrimg.src = data.qrimg || '';
        refreshButton.classList.remove('hidden');
        setStatus('请使用网易云音乐 App 扫码');
        setMeta('key: ' + currentKey);
        poll();
      }

      startButton.addEventListener('click', startLogin);
      refreshButton.addEventListener('click', startLogin);
      checkSessionButton.addEventListener('click', showSession);
      showSession().catch(() => undefined);
    </script>
  </body>
</html>`;
}

export function registerLoginHttpRoutes(
  app: express.Express,
  context: NcmApiContext,
): void {
  app.get('/login', (_req, res) => {
    const security = loadSecurityConfig();

    if (!security.exposeLoginPage) {
      res.status(403).type('text/plain').send(
        'Login page is disabled. Set NCM_EXPOSE_LOGIN_PAGE=true.',
      );
      return;
    }

    res.type('html').send(renderLoginPage());
  });

  app.get('/login/session', (_req, res) => {
    res.json(getServerSessionSnapshot());
  });

  app.post('/login/start', async (_req, res) => {
    const security = loadSecurityConfig();

    if (!security.exposeLoginPage) {
      res.status(403).json({
        message: 'Login page is disabled.',
      });
      return;
    }

    if (getServerSessionSnapshot().active) {
      res.status(409).json({
        message: 'A server-side session is already active.',
        session: getServerSessionSnapshot(),
      });
      return;
    }

    try {
      const keyResult = await context.api.login_qr_key({});
      const key = getQrData(keyResult).unikey;

      if (typeof key !== 'string' || !key.trim()) {
        res.status(502).json({
          message: 'Failed to get QR login key.',
          result: keyResult,
        });
        return;
      }

      const qrResult = await context.api.login_qr_create({
        key,
        qrimg: true,
      });
      const body = getQrData(qrResult);

      res.json({
        key,
        qrurl: body.qrurl,
        qrimg: body.qrimg,
      });
    } catch (error) {
      const normalized = normalizeToolError(error);
      res.status(502).json(normalized);
    }
  });

  app.get('/login/check', async (req, res) => {
    const security = loadSecurityConfig();

    if (!security.exposeLoginPage) {
      res.status(403).json({
        message: 'Login page is disabled.',
      });
      return;
    }

    const key = typeof req.query.key === 'string' ? req.query.key.trim() : '';
    if (!key) {
      res.status(400).json({
        message: 'Missing key query parameter.',
      });
      return;
    }

    try {
      const result = await context.api.login_qr_check({ key });
      const body = getBody(result);
      const code = body.code;
      const cookie =
        typeof body.cookie === 'string' ? body.cookie.trim() : '';

      if (code === 803 && cookie) {
        setServerSessionCookie(cookie, 'qr');
      }

      res.json({
        code,
        message: typeof body.message === 'string' ? body.message : undefined,
        authorized: code === 803,
        session: getServerSessionSnapshot(),
        result: redactSensitiveValue(result),
      });
    } catch (error) {
      const normalized = normalizeToolError(error);
      res.status(502).json(normalized);
    }
  });
}
