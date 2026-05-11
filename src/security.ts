import {
  METHOD_ACCESS,
  SERVER_SESSION_METHODS,
  TOOL_ACCESS,
} from './security-rules.js';

export type { MethodAccess } from './security-rules.js';
import type { MethodAccess } from './security-rules.js';
import { hasServerSession } from './server-session.js';

export type SecurityConfig = {
  allowWriteTools: boolean;
  exposeLoginPage: boolean;
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
  return {
    allowWriteTools: readBooleanEnv('NCM_ALLOW_WRITE_TOOLS', false),
    exposeLoginPage: readBooleanEnv('NCM_EXPOSE_LOGIN_PAGE', false),
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
    return !config.hasActiveSession;
  }

  if (access === 'auth-read') {
    return config.hasActiveSession;
  }

  return config.allowWriteTools && config.hasActiveSession;
}

export function isToolAllowed(
  config: SecurityConfig,
  toolName: string,
): boolean {
  const access = resolveToolAccess(toolName);

  if (access === 'write') {
    return config.allowWriteTools && config.hasActiveSession;
  }

  if (access === 'auth-read') {
    return config.hasActiveSession;
  }

  if (access === 'login-bootstrap') {
    return !config.hasActiveSession;
  }

  return true;
}

export function shouldUseServerSession(method: string): boolean {
  return SERVER_SESSION_METHODS.has(method);
}

export function sanitizeMethodParams(
  _config: SecurityConfig,
  params: Record<string, unknown>,
): { ok: true } | { ok: false; message: string } {
  if (params.cookie !== undefined) {
    return {
      ok: false,
      message: 'cookie passthrough is disabled. Use the server-side login flow instead.',
    };
  }

  if (
    params.proxy !== undefined ||
    params.realIP !== undefined ||
    params.randomCNIP !== undefined
  ) {
    return {
      ok: false,
      message: 'proxy/realIP/randomCNIP are disabled.',
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
