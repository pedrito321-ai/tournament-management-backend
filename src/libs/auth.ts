import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export function verifyAuth(req: Request) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.split(' ')[1];

  if (!token) {
    return {
      valid: false,
      response: NextResponse.json(
        { message: 'Acceso denegado. No se proporcionó token.' },
        { status: 401 }
      ),
    };
  }

  try {
    const secret = process.env.JWT_SECRET!;
    const decoded = jwt.verify(token, secret);
    return {
      valid: true,
      decoded,
    };
  } catch {
    return {
      valid: false,
      response: NextResponse.json(
        { message: 'Token inválido o expirado.' },
        { status: 403 }
      ),
    };
  }
}
