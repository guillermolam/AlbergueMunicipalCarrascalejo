export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'pilgrim' | 'admin';
  sessionId: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export async function login(email: string, password: string): Promise<AuthUser & AuthTokens> {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw new Error('Login failed');
  }

  return response.json();
}

export async function logout(): Promise<void> {
  await fetch('/api/auth/logout', {
    method: 'POST',
  });
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const response = await fetch('/api/auth/me');

  if (!response.ok) {
    return null;
  }

  return response.json();
}

export async function refreshToken(): Promise<AuthTokens> {
  const response = await fetch('/api/auth/refresh', {
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error('Token refresh failed');
  }

  return response.json();
}
