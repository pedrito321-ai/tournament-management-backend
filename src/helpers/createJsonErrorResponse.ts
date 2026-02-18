import { applyCorsHeaders } from '@/libs/cors';
import { NextRequest, NextResponse } from 'next/server';

interface ErrorResponsePayload {
  request: NextRequest;
  message?: string;
  status?: number;
}

export function createJsonErrorResponse({
  request,
  message = 'Error interno del servidor. Inténtalo más tarde.',
  status = 500,
}: ErrorResponsePayload) {
  const response = NextResponse.json({ error: message }, { status });

  return applyCorsHeaders(request, response);
}
