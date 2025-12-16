import { type NextRequest, NextResponse } from 'next/server';
import prisma from '@/libs/prisma';
import { verifyAuth } from '@/libs/auth';
import { ValidationError } from 'yup';
import { applyCorsHeaders, handleCorsOptions } from '@/libs/cors';
import { createJsonErrorResponse } from '@/helpers/createJsonErrorResponse';
import {
  getRobot,
  getRobotAdmin,
  updateRobot,
  RobotBusinessError,
} from '@/service/robot';
import { updateRobotSchema } from '@/schemas/robot.schema';

// Maneja la preflight request para CORS
export async function OPTIONS() {
  return handleCorsOptions();
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Autenticación opcional
    const auth = verifyAuth(request);
    const isAdmin = auth.valid && auth.decoded?.role === 'admin';

    const { id } = await params;
    const numericId = Number(id);

    if (isNaN(numericId)) {
      return createJsonErrorResponse({
        message: 'ID debe ser un número válido.',
        status: 400,
      });
    }

    // Bucar robot
    const robot = isAdmin
      ? await getRobotAdmin({ id: +id })
      : await getRobot({ id: +id });

    if (!robot) {
      return createJsonErrorResponse({
        message: `El robot con ID ${numericId} no existe`,
        status: 404,
      });
    }

    return applyCorsHeaders(NextResponse.json(robot));
  } catch (error) {
    if (error instanceof Error) {
      return createJsonErrorResponse({
        message: error.message,
        status: 500,
      });
    }

    // Error genérico
    return createJsonErrorResponse({});
  }
}

// Eliminar robots (admin y competitor)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Autenticación
    const auth = verifyAuth(request);
    if (!auth.valid) return auth.response;

    // Autorización
    const authUserRole = auth.decoded?.role;
    const allowedUserRoles = ['admin', 'competitor'];

    if (!allowedUserRoles.includes(authUserRole!)) {
      return createJsonErrorResponse({
        message: 'No tienes permisos para eliminar robot.',
        status: 403,
      });
    }

    const { id } = await params;
    const numericId = Number(id);

    if (isNaN(numericId)) {
      return createJsonErrorResponse({
        message: 'ID debe ser un número válido.',
        status: 400,
      });
    }

    // Verificar si el robot existe
    const existingNews = await prisma.robots.findUnique({
      where: { id: numericId },
    });

    if (!existingNews) {
      return createJsonErrorResponse({
        message: `El robot con ID ${numericId} no existe.`,
        status: 400,
      });
    }

    // Eliminar robot
    await prisma.robots.delete({ where: { id: numericId } });

    return applyCorsHeaders(
      NextResponse.json({
        message: `El robot con ID ${numericId} eliminado correctamente.`,
      })
    );
  } catch {
    // Error genérico
    return createJsonErrorResponse({});
  }
}

// Actualizar robot (admin y competitor)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Autenticación
    const auth = verifyAuth(request);
    if (!auth.valid) return auth.response;

    const role = auth.decoded?.role as 'admin' | 'competitor';
    const userId = Number(auth.decoded?.id);
    const robotId = Number((await params).id);

    // Validar ID
    if (isNaN(robotId)) {
      return createJsonErrorResponse({
        message: 'ID debe ser un número válido.',
        status: 400,
      });
    }

    // Autorización por rol
    if (!['admin', 'competitor'].includes(role)) {
      return createJsonErrorResponse({
        message: 'No tienes permisos para eliminar robot.',
        status: 403,
      });
    }

    // Buscar robot
    const robot = await prisma.robots.findUnique({ where: { id: robotId } });

    if (!robot) {
      return createJsonErrorResponse({
        message: 'Robot no encontrado.',
        status: 404,
      });
    }

    // Verificar propiedad (solo para competitors)
    if (role === 'competitor' && robot.competitor_id !== userId) {
      return createJsonErrorResponse({
        message: 'No puede editar un robot que no le pertenece.',
        status: 403,
      });
    }

    // Validar payload con schema
    const payload = await updateRobotSchema.validate(await request.json(), {
      abortEarly: false,
      stripUnknown: true,
    });

    // Verificar que la categoría existe si se proporciona
    if (payload.category_id) {
      const categoryExists = await prisma.categories.findUnique({
        where: { id: payload.category_id },
      });

      if (!categoryExists) {
        return createJsonErrorResponse({
          message: 'La categoría no existe.',
          status: 400,
        });
      }
    }

    // Actualizar robot (validaciones de negocio centralizadas en el servicio)
    const updatedRobot = await updateRobot({
      robotId,
      payload,
      currentRobot: robot,
      role,
    });

    return applyCorsHeaders(
      NextResponse.json({
        message: 'Robot actualizado correctamente.',
        data: updatedRobot,
      })
    );
  } catch (error) {
    // Error de validación de schema
    if (error instanceof ValidationError) {
      return createJsonErrorResponse({
        message: error.errors.join(', '),
        status: 400,
      });
    }

    // Errores de negocio del servicio
    if (error instanceof RobotBusinessError) {
      const statusMap: Record<string, number> = {
        COMPETITOR_ID_FORBIDDEN: 403,
        DUPLICATE_CATEGORY: 409,
        FORBIDDEN_FIELDS: 403,
      };
      return createJsonErrorResponse({
        message: error.message,
        status: statusMap[error.code] ?? 500,
      });
    }

    // Error genérico
    return createJsonErrorResponse({});
  }
}
