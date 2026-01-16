import { NextRequest } from 'next/server';

interface CreateMockRequestOptions {
  method?: string;
  url?: string;
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
  searchParams?: Record<string, string>;
}

/**
 * Creates a mock NextRequest for testing route handlers
 */
export function createMockRequest(options: CreateMockRequestOptions = {}): NextRequest {
  const {
    method = 'GET',
    url = 'http://localhost:3000/api/test',
    body,
    headers = {},
    searchParams = {},
  } = options;

  // Build URL with search params
  const urlObj = new URL(url);
  Object.entries(searchParams).forEach(([key, value]) => {
    urlObj.searchParams.set(key, value);
  });

  const requestInit: RequestInit = {
    method,
    headers: new Headers(headers),
  };

  if (body && method !== 'GET') {
    requestInit.body = JSON.stringify(body);
    (requestInit.headers as Headers).set('Content-Type', 'application/json');
  }

  return new NextRequest(urlObj.toString(), requestInit as unknown as import('next/dist/server/web/spec-extension/request').RequestInit);
}

/**
 * Creates a mock request with authorization header
 */
export function createAuthenticatedRequest(
  token: string,
  options: Omit<CreateMockRequestOptions, 'headers'> & { headers?: Record<string, string> } = {}
): NextRequest {
  return createMockRequest({
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  });
}

/**
 * Creates mock route params (for dynamic routes like [id])
 */
export function createMockParams<T extends Record<string, string>>(
  params: T
): { params: Promise<T> } {
  return {
    params: Promise.resolve(params),
  };
}
