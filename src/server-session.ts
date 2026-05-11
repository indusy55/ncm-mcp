import fs from 'node:fs';
import path from 'node:path';

type SessionSource = 'env' | 'qr';

export type ServerSessionSnapshot = {
  active: boolean;
  source?: SessionSource;
  updatedAt?: string;
};

type ServerSessionState = ServerSessionSnapshot & {
  cookie?: string;
};

const initialCookie = process.env.NETEASE_COOKIE?.trim();
const sessionFile = process.env.NCM_SESSION_FILE?.trim()
  ? path.resolve(process.env.NCM_SESSION_FILE.trim())
  : undefined;

function readPersistedSession(): ServerSessionState | undefined {
  if (!sessionFile || !fs.existsSync(sessionFile)) {
    return undefined;
  }

  try {
    const raw = fs.readFileSync(sessionFile, 'utf8');
    const parsed = JSON.parse(raw) as {
      cookie?: unknown;
      source?: unknown;
      updatedAt?: unknown;
    };
    const cookie =
      typeof parsed.cookie === 'string' ? normalizeCookie(parsed.cookie) : '';
    const source =
      parsed.source === 'env' || parsed.source === 'qr' ? parsed.source : 'qr';
    const updatedAt =
      typeof parsed.updatedAt === 'string' ? parsed.updatedAt : undefined;

    if (!cookie) {
      return undefined;
    }

    return {
      active: true,
      cookie,
      source,
      updatedAt,
    };
  } catch (error) {
    console.warn('Failed to read persisted NCM session:', error);
    return undefined;
  }
}

function writePersistedSession(state: ServerSessionState): void {
  if (!sessionFile || !state.cookie) {
    return;
  }

  try {
    fs.mkdirSync(path.dirname(sessionFile), { recursive: true });
    fs.writeFileSync(
      sessionFile,
      JSON.stringify(
        {
          cookie: state.cookie,
          source: state.source,
          updatedAt: state.updatedAt,
        },
        null,
        2,
      ),
      'utf8',
    );
  } catch (error) {
    console.warn('Failed to persist NCM session:', error);
  }
}

function removePersistedSession(): void {
  if (!sessionFile || !fs.existsSync(sessionFile)) {
    return;
  }

  try {
    fs.unlinkSync(sessionFile);
  } catch (error) {
    console.warn('Failed to remove persisted NCM session:', error);
  }
}

const state: ServerSessionState = initialCookie
  ? {
      active: true,
      cookie: initialCookie,
      source: 'env',
      updatedAt: new Date().toISOString(),
    }
  : readPersistedSession() ?? {
      active: false,
    };

function normalizeCookie(value: string): string {
  return value
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .join('; ');
}

export function getServerSessionSnapshot(): ServerSessionSnapshot {
  return {
    active: state.active,
    source: state.source,
    updatedAt: state.updatedAt,
  };
}

export function hasServerSession(): boolean {
  return state.active;
}

export function getServerSessionCookie(): string | undefined {
  return state.cookie;
}

export function setServerSessionCookie(
  cookie: string,
  source: SessionSource,
): void {
  const normalizedCookie = normalizeCookie(cookie);

  if (!normalizedCookie) {
    return;
  }

  state.active = true;
  state.cookie = normalizedCookie;
  state.source = source;
  state.updatedAt = new Date().toISOString();

  if (source === 'qr') {
    writePersistedSession(state);
  }
}

export function clearServerSession(): void {
  state.active = false;
  delete state.cookie;
  delete state.source;
  delete state.updatedAt;
  removePersistedSession();
}
