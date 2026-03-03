const REDIRECT_KEY = 'fleetmine.auth.redirect.path';

export function setPostLoginRedirect(path: string): void {
  if (!path || !path.startsWith('/')) return;
  sessionStorage.setItem(REDIRECT_KEY, path);
}

export function consumePostLoginRedirect(): string | null {
  const value = sessionStorage.getItem(REDIRECT_KEY);
  if (value) {
    sessionStorage.removeItem(REDIRECT_KEY);
    return value;
  }
  return null;
}

