import prisma from '@/libs/prisma';
import { NextResponse, NextRequest } from 'next/server';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { users } from '@prisma/client';
import { applyCorsHeaders, handleCorsOptions } from '@/libs/cors';

interface LoginRequest {
  email: users['email'];
  user_password: users['user_password'];
}

export async function OPTIONS() {
  return handleCorsOptions();
}

export async function POST(request: NextRequest) {
  try {
    const { email, user_password: password } =
      (await request.json()) as LoginRequest;

    const user = await prisma.users.findUnique({ where: { email } });

    if (!user?.is_active){
      return applyCorsHeaders(
        NextResponse.json(
          { error: 'Tu cuenta ha sido bloqueada. No puedes ingresar.' },
          { status: 403 }
        )
      );
    }

    if (!user) {
      return applyCorsHeaders(
        NextResponse.json(
          { error: 'Usuario no encontrado' },
          { status: 404 }
        )
      );
    }

    const validatePassword = await bcrypt.compare(
      password,
      user?.user_password as string
    );

    if (!validatePassword) {
      return applyCorsHeaders(
        NextResponse.json(
          { error: 'Contraseña incorrecta' },
          { status: 401 }
        )
      );
    }

    const token = jwt.sign(
      {
        id: user.id,
        nickname: user.nickname,
        role: user.role,
        email: user.email,
      },
      process.env.JWT_SECRET!,
      { expiresIn: Number(process.env.JWT_EXPIRES_IN) || 3600 }
    );

    return applyCorsHeaders(
      NextResponse.json({
        message: 'Login exitoso',
        token,
        user: {
          id: user?.id,
          name: user?.name,
          lastName: user?.lastName,
          nickname: user?.nickname,
          email: user?.email,
          role: user?.role,
        },
      })
    );
  } catch {
    return applyCorsHeaders(
      NextResponse.json(
        { error: 'Error interno del servidor' },
        { status: 500 }
      )
    );
  }
}

