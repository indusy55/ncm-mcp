import { createRequire } from 'node:module';
import path from 'node:path';

type UnknownRecord = Record<string, unknown>;

type NcmApiMethod = (params?: UnknownRecord) => Promise<unknown>;

type NcmApiModule = Record<string, unknown> & {
  getModulesDefinitions?: (
    modulesPath: string,
    specificRoute?: Record<string, string>,
    doRequire?: boolean,
  ) => Promise<Array<{ identifier?: string; route?: string }>>;
};

export type NcmMethodMeta = {
  name: string;
  route: string;
};

export type NcmApiContext = {
  api: Record<string, NcmApiMethod>;
  methods: NcmMethodMeta[];
  methodsByName: Map<string, NcmMethodMeta>;
};

const EXCLUDED_EXPORTS = new Set([
  'api',
  'default',
  'getModulesDefinitions',
  'module.exports',
  'server',
  'serveNcmApi',
]);

function isCallableMethod(value: unknown): value is NcmApiMethod {
  return typeof value === 'function';
}

function buildFallbackRoute(name: string): string {
  return `/${name.replaceAll('_', '/')}`;
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return 'Unknown error';
  }
}

function asRecord(value: unknown): UnknownRecord | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return undefined;
  }

  return value as UnknownRecord;
}

function compactRecord(record: UnknownRecord): UnknownRecord | undefined {
  const entries = Object.entries(record).filter(([, value]) => value !== undefined);

  if (entries.length === 0) {
    return undefined;
  }

  return Object.fromEntries(entries);
}

function normalizeApiRequestError(error: unknown):
  | {
      message: string;
      details?: UnknownRecord;
    }
  | undefined {
  const record = asRecord(error);
  const body = asRecord(record?.body);
  const rawMessage = body?.msg;
  const messageRecord = asRecord(rawMessage);

  if (!record || !body) {
    return undefined;
  }

  if (typeof rawMessage === 'string' && rawMessage.trim()) {
    return {
      message: rawMessage,
      details: compactRecord({
        status: record.status,
        code: body.code,
      }),
    };
  }

  if (!messageRecord) {
    return {
      message: toErrorMessage(error),
      details: compactRecord({
        status: record.status,
        code: body.code,
      }),
    };
  }

  const config = asRecord(messageRecord.config);
  const networkCode = messageRecord.code;
  const requestUrl = config?.url;
  const method = config?.method;

  const message =
    networkCode === 'ETIMEDOUT'
      ? `Request to Netease Cloud Music API timed out${typeof requestUrl === 'string' ? `: ${requestUrl}` : ''}`
      : typeof networkCode === 'string'
        ? `Request to Netease Cloud Music API failed: ${networkCode}`
        : typeof messageRecord.message === 'string' && messageRecord.message.trim()
          ? messageRecord.message
          : 'Request to Netease Cloud Music API failed';

  return {
    message,
    details: compactRecord({
      status: record.status,
      code: body.code,
      networkCode,
      name: messageRecord.name,
      method,
      url: requestUrl,
    }),
  };
}

export async function loadNcmApiContext(): Promise<NcmApiContext> {
  process.env.DOTENV_CONFIG_QUIET ??= 'true';

  const imported = await import('@neteasecloudmusicapienhanced/api');
  const rawModule = ((imported as { default?: unknown }).default ??
    imported) as NcmApiModule;

  const require = createRequire(import.meta.url);
  const entryPath = require.resolve('@neteasecloudmusicapienhanced/api');
  const modulesPath = path.join(path.dirname(entryPath), 'module');

  const routeEntries =
    typeof rawModule.getModulesDefinitions === 'function'
      ? await rawModule.getModulesDefinitions(modulesPath)
      : [];

  const routesByName = new Map<string, string>();

  for (const entry of routeEntries) {
    if (!entry.identifier || !entry.route) {
      continue;
    }

    routesByName.set(entry.identifier, entry.route);
  }

  const api: Record<string, NcmApiMethod> = {};

  for (const [key, value] of Object.entries(rawModule)) {
    if (EXCLUDED_EXPORTS.has(key) || !isCallableMethod(value)) {
      continue;
    }

    api[key] = value;
  }

  const methods = Object.keys(api)
    .sort((left, right) => left.localeCompare(right))
    .map((name) => ({
      name,
      route: routesByName.get(name) ?? buildFallbackRoute(name),
    }));

  const methodsByName = new Map(
    methods.map((method) => [method.name, method] as const),
  );

  return {
    api,
    methods,
    methodsByName,
  };
}

export function normalizeToolError(error: unknown): {
  message: string;
  details?: UnknownRecord;
} {
  const apiRequestError = normalizeApiRequestError(error);
  if (apiRequestError) {
    return apiRequestError;
  }

  if (error instanceof Error) {
    const details: UnknownRecord = {};

    const cause = (error as Error & { cause?: unknown }).cause;
    if (cause !== undefined) {
      details.cause = cause;
    }

    return {
      message: error.message,
      details: Object.keys(details).length > 0 ? details : undefined,
    };
  }

  if (typeof error === 'object' && error !== null) {
    return {
      message: toErrorMessage(error),
      details: error as UnknownRecord,
    };
  }

  return {
    message: toErrorMessage(error),
  };
}
