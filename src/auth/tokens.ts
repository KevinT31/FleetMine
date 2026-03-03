export interface StoredTokens {
  accessToken: string;
  idToken?: string;
  refreshToken?: string;
  tokenType?: string;
  scope?: string;
  expiresAt: number;
}

export interface TokenResponse {
  access_token: string;
  id_token?: string;
  refresh_token?: string;
  token_type?: string;
  scope?: string;
  expires_in: number;
}

const TOKENS_KEY = 'fleetmine.auth.tokens';

export function saveTokenResponse(payload: TokenResponse): StoredTokens {
  const tokens: StoredTokens = {
    accessToken: payload.access_token,
    idToken: payload.id_token,
    refreshToken: payload.refresh_token,
    tokenType: payload.token_type,
    scope: payload.scope,
    expiresAt: Date.now() + payload.expires_in * 1000,
  };

  localStorage.setItem(TOKENS_KEY, JSON.stringify(tokens));
  return tokens;
}

export function getStoredTokens(): StoredTokens | null {
  const raw = localStorage.getItem(TOKENS_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as StoredTokens;
  } catch {
    return null;
  }
}

export function clearStoredTokens(): void {
  localStorage.removeItem(TOKENS_KEY);
}

export function isTokenExpired(tokens: StoredTokens | null, skewMs = 30_000): boolean {
  if (!tokens) return true;
  return Date.now() >= tokens.expiresAt - skewMs;
}

export function getValidAccessToken(): string | null {
  const tokens = getStoredTokens();
  if (!tokens || isTokenExpired(tokens)) return null;
  return tokens.accessToken;
}

export function decodeJwtClaims<T extends Record<string, unknown>>(token?: string): T | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length < 2) return null;

  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    const json = atob(padded);
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}
