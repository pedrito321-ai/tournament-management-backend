import { verifyAuth } from '@/libs/auth';
import prisma from '@/libs/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { applyCorsHeaders, handleCorsOptions } from '@/libs/cors';
import { userRegisterSchema } from '@/schemas/user.schema';
import { validateRol } from '@/libs/user/validateRol';
import bcrypt from 'bcrypt';
import { createUser } from '@/service/users';
import { ValidationError } from 'yup';
import { createJsonErrorResponse } from '@/helpers/createJsonErrorResponse';
import {
  getUsers,
  validateEmailExists,
  validateNicknameExists,
} from '@/service/users';

export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}

export async function GET(request: NextRequest) {
  try {
    // Validar token de acceso
    const auth = verifyAuth(request);
    if (!auth.valid) return auth.response;

    const { searchParams } = new URL(request.url);

    const skip = Number(searchParams.get('skip'));
    const take = Number(searchParams.get('take') ?? 10);

    if (isNaN(skip) || skip < 0) {
      return createJsonErrorResponse({
        request,
        message: 'skip debe ser un número válido mayor o igual a 0.',
        status: 400,
      });
    }

    if (isNaN(take) || take < 1) {
      return createJsonErrorResponse({
        request,
        message: 'take debe ser un número válido mayor o igual a 1.',
        status: 400,
      });
    }

    const { total, users } = await getUsers({ skip, take });

    return applyCorsHeaders(
      request,
      NextResponse.json({
        message: 'Acceso concedido',
        total,
        data: users,
      })
    );
  } catch {
    // Error genérico
    return createJsonErrorResponse({ request });
  }
}

// Crear usuario (solo admin)
export async function POST(request: NextRequest) {
  try {
    // Verificar token
    const auth = verifyAuth(request);
    if (!auth.valid) return auth.response;

    // Verificar rol
    const userRole = auth.decoded?.role;

    if (userRole !== 'admin') {
      return createJsonErrorResponse({
        request,
        message: 'Solo los administradores pueden crear un usuario.',
        status: 403,
      });
    }

    const body = await request.json();

    const {
      name,
      lastName,
      age,
      nickname,
      email,
      user_password,
      role,
      club_id,
      dni,
      category_ids: rawCategories,
    } = await userRegisterSchema.validate(body, { abortEarly: false });

    // validar nickname
    const nick = await validateNicknameExists(prisma, nickname);

    if (nick.error) {
      return createJsonErrorResponse({
        request,
        message: nick.error,
        status: nick.status!,
      });
    }

    // validar email
    const mail = await validateEmailExists(prisma, email);

    if (mail.error) {
      return createJsonErrorResponse({
        request,
        message: mail.error,
        status: mail.status!,
      });
    }

    // validar categorías
    if (rawCategories) {
      for (const categoryId of rawCategories) {
        const categoryExists = await prisma.categories.findUnique({
          where: { id: categoryId },
        });

        if (!categoryExists) {
          return createJsonErrorResponse({
            request,
            message: `Categoría con ID ${categoryId} no existe.`,
            status: 400,
          });
        }
      }
    }

    // Normalizar categories
    const categories =
      rawCategories?.filter((v): v is number => v !== undefined) ?? undefined;

    // Validar datos según rol
    const roleValidationResult = await validateRol({
      currentRole: role!,
      club_id,
      dni,
      category_ids: categories,
    });

    if (roleValidationResult?.error) {
      return createJsonErrorResponse({
        request,
        message: roleValidationResult.error,
        status: roleValidationResult.status,
      });
    }

    // Hashear contraseña
    const hashedPassword = await bcrypt.hash(user_password, 10);

    // Crear usuario
    const newUser = await createUser({
      name,
      lastName,
      age,
      nickname,
      email,
      user_password: hashedPassword,
      role,
      club_id,
      dni,
      category_ids: categories,
    });

    // No generamos token, solo devolvemos info del usuario
    return applyCorsHeaders(
      request,
      NextResponse.json(
        {
          message: 'Usuario creado exitosamente por admin',
          user: {
            id: newUser.id,
            name: newUser.name,
            lastName: newUser.lastName,
            age: newUser.age,
            nickname: newUser.nickname,
            email: newUser.email,
            profile_picture: newUser.profile_picture,
            role: newUser.role,
          },
        },
        { status: 201 }
      )
    );
  } catch (error) {
    if (error instanceof ValidationError) {
      return applyCorsHeaders(
        request,
        NextResponse.json({ error: error.errors }, { status: 400 }),
      );
    }

    return applyCorsHeaders(
      request,
      NextResponse.json(
        { error: 'Error interno del servidor' },
        { status: 500 },
      ),
    );
  }
}