import { applyCorsHeaders } from '@/libs/cors';
import { NextResponse } from 'next/server';

interface ErrorResponsePayload {
  message?: string;
  status?: number;
}

export function createJsonErrorResponse({
  message = 'Error interno del servidor. Inténtalo más tarde.',
  status  = 500,
}: ErrorResponsePayload) {
  return applyCorsHeaders(NextResponse.json({ error: message }, { status }));
}
