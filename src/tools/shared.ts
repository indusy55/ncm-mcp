import type { NcmApiContext } from '../ncm-api.js';
import { normalizeToolError } from '../ncm-api.js';
import type { SecurityConfig } from '../security.js';
import { isMethodAllowed, sanitizeMethodParams } from '../security.js';

export type UnknownRecord = Record<string, unknown>;

export type ToolResult = {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  structuredContent?: UnknownRecord;
  isError?: boolean;
};

export type ResultNormalizer = (
  result: unknown,
  params: UnknownRecord,
) => UnknownRecord | undefined;

export const requestBaseSchema = {
  cookie: undefined,
  proxy: undefined,
  realIP: undefined,
  randomCNIP: undefined,
};

export function toPrettyJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export function asRecord(value: unknown): UnknownRecord | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return undefined;
  }

  return value as UnknownRecord;
}

export function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function getBody(result: unknown): UnknownRecord {
  const record = asRecord(result);
  return asRecord(record?.body) ?? {};
}

export function pick<T extends string>(
  source: UnknownRecord | undefined,
  keys: readonly T[],
): Partial<Record<T, unknown>> {
  if (!source) {
    return {};
  }

  const target: Partial<Record<T, unknown>> = {};

  for (const key of keys) {
    const value = source[key];
    if (value !== undefined) {
      target[key] = value;
    }
  }

  return target;
}

export async function callMethod(
  context: NcmApiContext,
  security: SecurityConfig,
  method: string,
  params: UnknownRecord,
  normalizeResult?: ResultNormalizer,
): Promise<ToolResult> {
  if (!isMethodAllowed(security, method)) {
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: `Method is disabled by server policy: ${method}`,
        },
      ],
      structuredContent: {
        method,
        policyDenied: true,
      },
    };
  }

  const sanitized = sanitizeMethodParams(security, params);
  if (!sanitized.ok) {
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: sanitized.message,
        },
      ],
      structuredContent: {
        method,
        policyDenied: true,
      },
    };
  }

  const fn = context.api[method];

  if (!fn) {
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: `Unknown method: ${method}`,
        },
      ],
      structuredContent: {
        method,
        available: false,
      },
    };
  }

  try {
    const result = await fn(params);

    return {
      content: [
        {
          type: 'text',
          text: toPrettyJson(result),
        },
      ],
      structuredContent: {
        method,
        params,
        data: normalizeResult?.(result, params),
        result: result as UnknownRecord,
      },
    };
  } catch (error) {
    const normalized = normalizeToolError(error);

    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: normalized.message,
        },
      ],
      structuredContent: {
        method,
        params,
        error: normalized,
      },
    };
  }
}
