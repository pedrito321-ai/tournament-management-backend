import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import prisma from '@/libs/prisma';
import { passwordResetSchema } from '@/schemas/user.schema';
import { ValidationError } from 'yup';
import { applyCorsHeaders, handleCorsOptions } from '@/libs/cors';

const JWT_SECRET = process.env.JWT_SECRET!;

export async function OPTIONS() {
  return handleCorsOptions();
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const { newPassword } = await passwordResetSchema.validate(
      await req.json(),
      { abortEarly: false }
    );

    // Verifica token JWT
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number, email: string };

    // Buscar token en BD
    const resetToken = await prisma.password_resets.findFirst({
      where: { token, user_id: decoded.id },
    });

    if (!resetToken) {
      return applyCorsHeaders(
        NextResponse.json(
          { error: 'Token inválido o ya utilizado' },
          { status: 400 }
        )
      );
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Guarda en BD
    await prisma.users.update({
      where: { id: decoded.id },
      data: { user_password: hashedPassword },
    });

    // Eliminar token tras usarse (evita reutilización)
    await prisma.password_resets.delete({ where: { id: resetToken.id } });

    return applyCorsHeaders(
      NextResponse.json({
        message: 'Contraseña actualizada correctamente'
      })
    );
  } catch (error) {
    const errorMessage =
      error instanceof ValidationError
        ? error.errors.join(', ')
        : 'Error al restablecer la contraseña';

    return applyCorsHeaders(
      NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      )
    );
  }
}

