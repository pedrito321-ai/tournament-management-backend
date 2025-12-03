import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { applyCorsHeaders, handleCorsOptions } from '@/libs/cors';

interface DecodedToken {
  id: string;
  role: string;
  email: string;
}

export async function OPTIONS() {
  return handleCorsOptions();
}

export function verifyAuth(req: Request) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.split(' ')[1];

  // Si no hay token → devolver con CORS
  if (!token) {
    return {
      valid: false,
      response: applyCorsHeaders(
        NextResponse.json(
          { message: 'Acceso denegado. No se proporcionó token.' },
          { status: 401 }
        )
      )
    };
  }

  try {
    const secret = process.env.JWT_SECRET!;
    const decoded = jwt.verify(token, secret) as DecodedToken;
    return { valid: true, decoded };

  } catch {
    return {
      valid: false,
      response: applyCorsHeaders(
        NextResponse.json(
          { message: 'Token inválido o expirado.' },
          { status: 403 }
        )
      )
    };
  }
}
