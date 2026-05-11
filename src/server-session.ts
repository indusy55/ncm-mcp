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

const state: ServerSessionState = initialCookie
  ? {
      active: true,
      cookie: initialCookie,
      source: 'env',
      updatedAt: new Date().toISOString(),
    }
  : {
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
}

export function clearServerSession(): void {
  state.active = false;
  delete state.cookie;
  delete state.source;
  delete state.updatedAt;
}
