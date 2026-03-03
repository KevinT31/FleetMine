import { createPkcePair, createStateToken } from './pkce';
import {
  clearStoredTokens,
  decodeJwtClaims,
  getStoredTokens,
  type TokenResponse,
  getValidAccessToken,
  saveTokenResponse,
} from './tokens';

export interface AuthUser {
  sub?: string;
  email?: string;
  username?: string;
  preferredUsername?: string;
  name?: string;
}

function isTokenResponse(payload: unknown): payload is TokenResponse {
  if (!payload || typeof payload !== 'object') return false;
  const obj = payload as Record<string, unknown>;
  return typeof obj.access_token === 'string' && typeof obj.expires_in === 'number';
}

const PKCE_VERIFIER_KEY = 'fleetmine.auth.pkce.verifier';
const OAUTH_STATE_KEY = 'fleetmine.auth.pkce.state';

const COGNITO_REGION = import.meta.env.VITE_COGNITO_REGION ?? 'eu-central-1';
const COGNITO_DOMAIN = import.meta.env.VITE_COGNITO_DOMAIN ?? '';
const COGNITO_CLIENT_ID = import.meta.env.VITE_COGNITO_CLIENT_ID ?? '';
const COGNITO_REDIRECT_URI = import.meta.env.VITE_COGNITO_REDIRECT_URI ?? 'http://localhost:5173/auth/callback';
const COGNITO_LOGOUT_URI = import.meta.env.VITE_COGNITO_LOGOUT_URI ?? 'http://localhost:5173/';
const COGNITO_SCOPES = import.meta.env.VITE_COGNITO_SCOPES ?? 'openid profile email';

function resolveDomainBase(): string {
  const domain = COGNITO_DOMAIN.trim();
  if (!domain) return '';

  if (domain.startsWith('http://') || domain.startsWith('https://')) {
    return domain.replace(/\/+$/, '');
  }

  if (domain.includes('.amazoncognito.com')) {
    return `https://${domain}`;
  }

  return `https://${domain}.auth.${COGNITO_REGION}.amazoncognito.com`;
}

const DOMAIN_BASE = resolveDomainBase();

function requireAuthConfig(): void {
  if (!DOMAIN_BASE || !COGNITO_CLIENT_ID || !COGNITO_REDIRECT_URI) {
    throw new Error('Missing Cognito config. Check VITE_COGNITO_* variables in .env.local');
  }
}

function parseJsonSafe(raw: string): unknown {
  if (!raw.trim()) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

export async function login(): Promise<void> {
  requireAuthConfig();

  const { verifier, challenge } = await createPkcePair();
  const state = createStateToken(48);
  localStorage.setItem(PKCE_VERIFIER_KEY, verifier);
  localStorage.setItem(OAUTH_STATE_KEY, state);

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: COGNITO_CLIENT_ID,
    redirect_uri: COGNITO_REDIRECT_URI,
    scope: COGNITO_SCOPES,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state,
  });

  window.location.assign(`${DOMAIN_BASE}/oauth2/authorize?${params.toString()}`);
}

export async function handleCallback(search: string): Promise<void> {
  requireAuthConfig();

  const params = new URLSearchParams(search);
  const error = params.get('error');
  if (error) {
    const description = params.get('error_description') ?? 'Unknown OAuth error';
    throw new Error(`${error}: ${description}`);
  }

  const code = params.get('code');
  if (!code) {
    throw new Error('Missing authorization code in callback URL');
  }

  const storedState = localStorage.getItem(OAUTH_STATE_KEY);
  const returnedState = params.get('state');
  if (storedState && returnedState && storedState !== returnedState) {
    throw new Error('Invalid OAuth state value');
  }

  const codeVerifier = localStorage.getItem(PKCE_VERIFIER_KEY);
  if (!codeVerifier) {
    throw new Error('Missing PKCE code verifier in storage');
  }

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: COGNITO_CLIENT_ID,
    redirect_uri: COGNITO_REDIRECT_URI,
    code,
    code_verifier: codeVerifier,
  });

  const response = await fetch(`${DOMAIN_BASE}/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  const raw = await response.text();
  const payload = parseJsonSafe(raw) as { error?: string; error_description?: string; [k: string]: unknown } | string | null;
  if (!response.ok) {
    const message =
      typeof payload === 'string'
        ? payload
        : payload?.error_description || payload?.error || `HTTP ${response.status}`;
    throw new Error(`Token exchange failed: ${message}`);
  }

  if (!isTokenResponse(payload)) {
    throw new Error('Token exchange returned unexpected payload');
  }

  saveTokenResponse(payload);
  localStorage.removeItem(PKCE_VERIFIER_KEY);
  localStorage.removeItem(OAUTH_STATE_KEY);
}

export function logout(): void {
  clearStoredTokens();
  localStorage.removeItem(PKCE_VERIFIER_KEY);
  localStorage.removeItem(OAUTH_STATE_KEY);

  if (!DOMAIN_BASE || !COGNITO_CLIENT_ID) {
    window.location.assign(COGNITO_LOGOUT_URI);
    return;
  }

  const params = new URLSearchParams({
    client_id: COGNITO_CLIENT_ID,
    logout_uri: COGNITO_LOGOUT_URI,
  });

  window.location.assign(`${DOMAIN_BASE}/logout?${params.toString()}`);
}

export function getAccessToken(): string | null {
  return getValidAccessToken();
}

export function getCurrentUser(): AuthUser | null {
  const tokens = getStoredTokens();
  const claims = decodeJwtClaims<Record<string, unknown>>(tokens?.idToken);
  if (!claims) return null;

  return {
    sub: typeof claims.sub === 'string' ? claims.sub : undefined,
    email: typeof claims.email === 'string' ? claims.email : undefined,
    username: typeof claims['cognito:username'] === 'string' ? claims['cognito:username'] : undefined,
    preferredUsername:
      typeof claims.preferred_username === 'string' ? claims.preferred_username : undefined,
    name: typeof claims.name === 'string' ? claims.name : undefined,
  };
}

export function isAuthenticated(): boolean {
  return Boolean(getAccessToken());
}
