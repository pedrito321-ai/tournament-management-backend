import { NextResponse } from 'next/server';

const CORS_CONFIG = {
  origin: process.env.ADMIN_PANEL_URL || 'http://localhost:5173',
  credentials: 'true',
  methods: 'GET,POST,PUT,DELETE,OPTIONS',
  headers: 'Content-Type, Authorization',
};

/**
 * Aplica headers CORS a una respuesta
 * @param response - NextResponse object
 * @returns NextResponse con headers CORS aplicados
 */
export function applyCorsHeaders(response: NextResponse): NextResponse {
  response.headers.set('Access-Control-Allow-Origin', CORS_CONFIG.origin);
  response.headers.set('Access-Control-Allow-Credentials', CORS_CONFIG.credentials);
  response.headers.set('Access-Control-Allow-Methods', CORS_CONFIG.methods);
  response.headers.set('Access-Control-Allow-Headers', CORS_CONFIG.headers);
  
  return response;
}

/**
 * Crea respuesta para preflight OPTIONS request
 * @returns NextResponse con status 204 y headers CORS
 */
export function handleCorsOptions(): NextResponse {
  const response = new NextResponse(null, { status: 204 });
  return applyCorsHeaders(response);
}
