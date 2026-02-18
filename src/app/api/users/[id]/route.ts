import { type NextRequest, NextResponse } from 'next/server';
import prisma from '@/libs/prisma';
import { verifyAuth } from '@/libs/auth';
import { applyCorsHeaders, handleCorsOptions } from '@/libs/cors';
import { userUpdateSchema } from '@/schemas/user.schema';
import { ValidationError } from 'yup';
import { createJsonErrorResponse } from '@/helpers/createJsonErrorResponse';
import { getUser } from '@/service/users';
import {
  validateBaseFieldsPermissions,
  validateClubOwnerPermissions,
  validateCompetitorPermissions,
  validateJudgePermissions,
} from '@/service/users/user.validator';
import { updateUser } from '@/service/users';

export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}

// Obtener usuario (debe iniciar sesión)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Validar token de acceso
    const auth = verifyAuth(request);
    if (!auth.valid) return auth.response;

    const { id } = await params;

    const numericId = Number(id);

    if (isNaN(numericId)) {
      return createJsonErrorResponse({
        request,
        message: 'ID debe ser un número válido.',
        status: 400,
      });
    }

    // Buscar usuario
    const user = await getUser({ numericId });

    if (!user) {
      return createJsonErrorResponse({
        request,
        message: `El usuario con ID ${numericId} no existe`,
        status: 404,
      });
    }

    return applyCorsHeaders(request, NextResponse.json(user));
  } catch {
    // Error genérico
    return createJsonErrorResponse({ request });
  }
}

// Eliminar usuario (admin)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verificar token
    const auth = verifyAuth(request);
    if (!auth.valid) return auth.response;

    // Verificar rol
    const userRole = auth.decoded?.role;

    if (userRole !== 'admin') {
      return createJsonErrorResponse({
        request,
        message: 'Solo los administradores pueden eliminar usuarios.',
        status: 403,
      });
    }

    const { id } = await params;
    const numericId = Number(id);

    if (isNaN(numericId)) {
      return createJsonErrorResponse({
        request,
        message: 'ID debe ser un número válido.',
        status: 400,
      });
    }

    // Verificar si el usuario ya existe
    const existingUser = await prisma.users.findUnique({
      where: { id: numericId },
    });

    if (!existingUser) {
      return createJsonErrorResponse({
        request,
        message: `El usuario con ID ${numericId} no existe.`,
        status: 400,
      });
    }

    // Eliminar el usuario
    await prisma.users.delete({
      where: { id: numericId },
    });

    return applyCorsHeaders(
      request,
      NextResponse.json({
        message: `El usuario con ID ${numericId} eliminado correctamente.`,
      })
    );
  } catch {
    // Error génerico
    return createJsonErrorResponse({ request });
  }
}

// Actualizar usuario (dueño del perfíl y admin)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // autenticación
    const auth = verifyAuth(request);
    if (!auth.valid || !auth.decoded) return auth.response;

    const authenticatedUser = auth.decoded;

    // validación de parámetros
    const { id } = await params;
    const numericId = Number(id);

    if (isNaN(numericId)) {
      return createJsonErrorResponse({
        request,
        message: 'El ID del usuario debe ser un número válido.',
        status: 400,
      });
    }

    // usuario a editar
    const userToEdit = await prisma.users.findUnique({
      where: { id: numericId },
      include: {
        club_owner: true,
        competitor: { include: { club: true } },
        judges: { include: { categories: true } },
      },
    });

    if (!userToEdit) {
      return createJsonErrorResponse({
        request,
        message: 'Usuario a editar no existe.',
        status: 404,
      });
    }

    // body + esquema
    const body = await request.json();
    await userUpdateSchema.validate(body, { abortEarly: false });

    // validadores
    const validators = [
      validateBaseFieldsPermissions(body, userToEdit, authenticatedUser),
      validateCompetitorPermissions(body, userToEdit, authenticatedUser),
      validateClubOwnerPermissions(body, userToEdit, authenticatedUser),
      await validateJudgePermissions(
        body,
        userToEdit,
        authenticatedUser,
        prisma
      ),
    ];

    const validationError = validators.find((v) => v?.error);
    if (validationError) {
      return createJsonErrorResponse({
        request,
        message: validationError.error,
        status: validationError.status,
      });
    }

    // servicio (actualiza la BD)
    const updatedUser = await updateUser({
      userId: numericId,
      body,
      authenticatedUserId: Number(authenticatedUser.id),
      isAdmin: authenticatedUser.role === 'admin',
      prisma,
    });

    return applyCorsHeaders(
      request,
      NextResponse.json({
        message: 'Usuario actualizado correctamente.',
        data: updatedUser,
      })
    );
  } catch (error) {
    if (error instanceof ValidationError) {
      return createJsonErrorResponse({
        request,
        message: error.errors.join(', '),
        status: 500,
      });
    }

    return createJsonErrorResponse({ request });
  }
}
