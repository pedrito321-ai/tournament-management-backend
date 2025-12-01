import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import jwt from 'jsonwebtoken'

export async function middleware(req: NextRequest) {
  const token = req.headers.get('authorization')?.split(' ')[1]

  // Si no es endpoint protegido, dejar pasar
  if (!req.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // Si no hay token
  if (!token) {
    return NextResponse.json({ error: 'Acceso no autorizado' }, { status: 401 });
  }

  try {
    jwt.verify(token, process.env.JWT_SECRET!)
    return NextResponse.next();
  } catch {
    return NextResponse.json({ error: 'Token inválido o expirado' }, { status: 403 });
  }
}

export const config = {
  // protege todas las rutas de /api
  matcher: ['/api/:path*'],
}
