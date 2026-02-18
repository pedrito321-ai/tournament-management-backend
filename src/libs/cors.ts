import { NextRequest, NextResponse } from 'next/server';

// Convertimos variable .env en array
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim());

const CORS_CONFIG = {
  credentials: 'true',
  methods: 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  headers: 'Content-Type, Authorization',
};

/**
 * Aplica headers CORS a una respuesta
 * @param request - NextRequest object para obtener el origen
 * @param response - NextResponse object
 * @returns NextResponse con headers CORS aplicados
 */
export function applyCorsHeaders(
  request: NextRequest,
  response: NextResponse,
): NextResponse {
  const origin = request.headers.get('origin');

  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  }

  response.headers.set(
    'Access-Control-Allow-Credentials',
    CORS_CONFIG.credentials,
  );
  response.headers.set('Access-Control-Allow-Methods', CORS_CONFIG.methods);
  response.headers.set('Access-Control-Allow-Headers', CORS_CONFIG.headers);

  return response;
}

/**
 * Crea respuesta para preflight OPTIONS request
 * @param request - NextRequest object
 * @returns NextResponse con status 204 y headers CORS
 */
export function handleCorsOptions(request: NextRequest): NextResponse {
  const response = new NextResponse(null, { status: 204 });
  return applyCorsHeaders(request, response);
}
