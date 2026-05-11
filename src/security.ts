import {
  METHOD_ACCESS,
  SERVER_SESSION_METHODS,
  TOOL_ACCESS,
} from './security-rules.js';

export type { MethodAccess } from './security-rules.js';
import type { MethodAccess } from './security-rules.js';
import { hasServerSession } from './server-session.js';

export type SecurityConfig = {
  enableLoginBootstrap: boolean;
  allowAuthenticatedReads: boolean;
  allowWriteTools: boolean;
  allowCookieAuth: boolean;
  allowNetworkOverrides: boolean;
  enableNcmCall: boolean;
  allowedTools: Set<string> | null;
  hasActiveSession: boolean;
};

function readBooleanEnv(name: string, fallback: boolean): boolean {
  const value = process.env[name];

  if (value === undefined) {
    return fallback;
  }

  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

export function loadSecurityConfig(): SecurityConfig {
  const allowedToolsRaw = process.env.NCM_ALLOWED_TOOLS?.trim();
  const allowedTools = allowedToolsRaw
    ? new Set(
        allowedToolsRaw
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
      )
    : null;

  return {
    enableLoginBootstrap: readBooleanEnv('NCM_ENABLE_LOGIN_BOOTSTRAP', false),
    allowAuthenticatedReads: readBooleanEnv(
      'NCM_ALLOW_AUTH_READS',
      false,
    ),
    allowWriteTools: readBooleanEnv('NCM_ALLOW_WRITE_TOOLS', false),
    allowCookieAuth: readBooleanEnv('NCM_ALLOW_COOKIE_AUTH', false),
    allowNetworkOverrides: readBooleanEnv('NCM_ALLOW_NETWORK_OVERRIDES', false),
    enableNcmCall: readBooleanEnv('NCM_ENABLE_NCM_CALL', false),
    allowedTools,
    hasActiveSession: hasServerSession(),
  };
}

export function resolveMethodAccess(method: string): MethodAccess {
  return METHOD_ACCESS[method] ?? 'write';
}

export function resolveToolAccess(toolName: string): MethodAccess {
  return TOOL_ACCESS[toolName] ?? 'public';
}

export function isMethodAllowed(
  config: SecurityConfig,
  method: string,
): boolean {
  const access = resolveMethodAccess(method);

  if (access === 'public') {
    return true;
  }

  if (access === 'login-bootstrap') {
    return config.enableLoginBootstrap && !config.hasActiveSession;
  }

  if (access === 'auth-read') {
    return config.allowAuthenticatedReads && config.hasActiveSession;
  }

  return config.allowWriteTools && config.hasActiveSession;
}

export function isToolAllowed(
  config: SecurityConfig,
  toolName: string,
): boolean {
  if (config.allowedTools && !config.allowedTools.has(toolName)) {
    return false;
  }

  if (toolName === 'ncm_call') {
    return config.enableNcmCall;
  }

  const access = resolveToolAccess(toolName);

  if (access === 'write') {
    return config.allowWriteTools;
  }

  if (access === 'auth-read') {
    return config.allowAuthenticatedReads;
  }

  if (access === 'login-bootstrap') {
    return config.enableLoginBootstrap && !config.hasActiveSession;
  }

  return true;
}

export function shouldUseServerSession(method: string): boolean {
  return SERVER_SESSION_METHODS.has(method);
}

export function sanitizeMethodParams(
  config: SecurityConfig,
  params: Record<string, unknown>,
): { ok: true } | { ok: false; message: string } {
  if (params.cookie !== undefined && !config.allowCookieAuth) {
    return {
      ok: false,
      message:
        'cookie passthrough is disabled. Set NCM_ALLOW_COOKIE_AUTH=true to allow per-request auth.',
    };
  }

  if (
    (params.proxy !== undefined ||
      params.realIP !== undefined ||
      params.randomCNIP !== undefined) &&
    !config.allowNetworkOverrides
  ) {
    return {
      ok: false,
      message:
        'proxy/realIP/randomCNIP are disabled. Set NCM_ALLOW_NETWORK_OVERRIDES=true to allow network override params.',
    };
  }

  return { ok: true };
}

export function listAllowedTools(
  config: SecurityConfig,
  tools: string[],
): string[] {
  return tools.filter((tool) => isToolAllowed(config, tool));
}
