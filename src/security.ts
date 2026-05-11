export type MethodAccess = 'public' | 'auth' | 'write';

export type SecurityConfig = {
  toolMode: 'readonly' | 'authenticated' | 'full';
  allowCookieAuth: boolean;
  allowNetworkOverrides: boolean;
  enableNcmCall: boolean;
  allowedTools: Set<string> | null;
};

const PUBLIC_METHODS = new Set([
  'album',
  'artist_album',
  'artist_detail',
  'artist_songs',
  'cloudsearch',
  'comment_album',
  'comment_music',
  'comment_mv',
  'comment_playlist',
  'comment_video',
  'lyric',
  'mv_detail',
  'mv_url',
  'playlist_catlist',
  'playlist_detail',
  'playlist_track_all',
  'related_allvideo',
  'simi_artist',
  'simi_playlist',
  'simi_song',
  'song_detail',
  'song_url_v1',
  'top_playlist',
  'top_playlist_highquality',
  'top_song',
  'toplist',
  'toplist_detail',
  'user_detail',
  'user_followeds',
  'user_follows',
  'user_playlist',
  'user_record',
]);

const AUTH_METHODS = new Set([
  'captcha_sent',
  'captcha_verify',
  'cellphone_existence_check',
  'likelist',
  'login',
  'login_cellphone',
  'login_qr_check',
  'login_qr_create',
  'login_qr_key',
  'login_refresh',
  'login_status',
  'logout',
  'personalized',
  'recommend_songs',
  'user_account',
  'user_subcount',
]);

const WRITE_METHODS = new Set([
  'like',
  'playlist_create',
  'playlist_delete',
  'playlist_desc_update',
  'playlist_name_update',
  'playlist_order_update',
  'playlist_subscribe',
  'playlist_track_add',
  'playlist_track_delete',
]);

const AUTH_TOOL_NAMES = new Set([
  'ncm_login_qr_key',
  'ncm_login_qr_create',
  'ncm_login_qr_check',
  'ncm_login_qr_start',
  'ncm_login_email',
  'ncm_login_cellphone',
  'ncm_captcha_send',
  'ncm_captcha_verify',
  'ncm_cellphone_existence_check',
  'ncm_login_status',
  'ncm_login_refresh',
  'ncm_logout',
  'ncm_user_account',
  'ncm_user_subcount',
  'ncm_liked_songs',
  'ncm_recommended_playlists',
  'ncm_recommended_songs',
]);

const WRITE_TOOL_NAMES = new Set([
  'ncm_like_song',
  'ncm_playlist_create',
  'ncm_playlist_delete',
  'ncm_playlist_name_update',
  'ncm_playlist_desc_update',
  'ncm_playlist_order_update',
  'ncm_playlist_subscribe',
  'ncm_playlist_track_add',
  'ncm_playlist_track_delete',
]);

function readBooleanEnv(name: string, fallback: boolean): boolean {
  const value = process.env[name];

  if (value === undefined) {
    return fallback;
  }

  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

export function loadSecurityConfig(): SecurityConfig {
  const toolMode = (
    process.env.NCM_TOOL_MODE ?? 'readonly'
  ).toLowerCase() as SecurityConfig['toolMode'];

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
    toolMode:
      toolMode === 'authenticated' || toolMode === 'full'
        ? toolMode
        : 'readonly',
    allowCookieAuth: readBooleanEnv('NCM_ALLOW_COOKIE_AUTH', false),
    allowNetworkOverrides: readBooleanEnv('NCM_ALLOW_NETWORK_OVERRIDES', false),
    enableNcmCall: readBooleanEnv('NCM_ENABLE_NCM_CALL', true),
    allowedTools,
  };
}

export function resolveMethodAccess(method: string): MethodAccess {
  if (WRITE_METHODS.has(method)) {
    return 'write';
  }

  if (AUTH_METHODS.has(method)) {
    return 'auth';
  }

  if (PUBLIC_METHODS.has(method)) {
    return 'public';
  }

  return 'auth';
}

export function isMethodAllowed(
  config: SecurityConfig,
  method: string,
): boolean {
  const access = resolveMethodAccess(method);

  if (access === 'public') {
    return true;
  }

  if (access === 'auth') {
    return config.toolMode === 'authenticated' || config.toolMode === 'full';
  }

  return config.toolMode === 'full';
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

  if (WRITE_TOOL_NAMES.has(toolName)) {
    return config.toolMode === 'full';
  }

  if (AUTH_TOOL_NAMES.has(toolName)) {
    return config.toolMode === 'authenticated' || config.toolMode === 'full';
  }

  return true;
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
