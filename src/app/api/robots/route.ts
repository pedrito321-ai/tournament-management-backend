import { createJsonErrorResponse } from '@/helpers/createJsonErrorResponse';
import { verifyAuth } from '@/libs/auth';
import { applyCorsHeaders, handleCorsOptions } from '@/libs/cors';
import prisma from '@/libs/prisma';
import { createRobotSchema } from '@/schemas/robot.schema';
import { getRobots, getRobotsAdmin, createRobot } from '@/service/robot';
import { NextRequest, NextResponse } from 'next/server';
import { ValidationError } from 'yup';

// Maneja la preflight request para CORS
export async function OPTIONS() {
  return handleCorsOptions();
}

export async function GET(request: NextRequest) {
  try {
    // Autenticación opcional
    const auth = verifyAuth(request);
    const isAdmin = auth.valid && auth.decoded?.role === 'admin';

    const { searchParams } = new URL(request.url);

    const skip = Number(searchParams.get('skip'));
    const take = Number(searchParams.get('take') ?? 10);

    if (isNaN(skip) || skip < 0) {
      return createJsonErrorResponse({
        message: 'skip debe ser un número válido mayor o igual a 0.',
        status: 400,
      });
    }

    if (isNaN(take) || take < 1) {
      return createJsonErrorResponse({
        message: 'take debe ser un número válido mayor o igual a 1.',
        status: 400,
      });
    }

    const { total, robots } = isAdmin
      ? await getRobotsAdmin({ skip, take })
      : await getRobots({ skip, take });

    return applyCorsHeaders(
      NextResponse.json({
        total,
        data: robots,
      })
    );
  } catch {
    return createJsonErrorResponse({});
  }
}

// Crear robot (solo competidor).
export async function POST(request: NextRequest) {
  try {
    // Autenticación
    const auth = verifyAuth(request);
    if (!auth.valid) return auth.response;

    const authUserRole = auth.decoded?.role;
    const authUserId = auth.decoded?.id;

    // Autorización
    if (authUserRole !== 'competitor') {
      return createJsonErrorResponse({
        message: 'Solo los competidores pueden crear robots.',
        status: 403,
      });
    }

    // Validación de payload
    const payload = await request.json();
    const data = await createRobotSchema.validate(payload, {
      abortEarly: false,
      stripUnknown: true,
    });

    // Verificar que el competidor existe
    const competitorExists = await prisma.competitors.findUnique({
      where: { user_id: Number(authUserId) },
    });

    if (!competitorExists) {
      return createJsonErrorResponse({
        message: 'El usuario no está registrado como competidor.',
        status: 400,
      });
    }

    // Verificar que la categoría existe
    const categoryExists = await prisma.categories.findUnique({
      where: { id: data.category_id },
    });

    if (!categoryExists) {
      return createJsonErrorResponse({
        message: 'La categoría no existe',
        status: 400,
      });
    }

    const existingRobot = await prisma.robots.findFirst({
      where: {
        competitor_id: +authUserId!,
        category_id: data.category_id,
      },
    });

    if (existingRobot) {
      return createJsonErrorResponse({
        message: 'Ya tienes un robot registrado en esta categoría.',
        status: 409,
      });
    }

    // Crear robot
    const robot = await createRobot(data, competitorExists.user_id);

    return applyCorsHeaders(
      NextResponse.json(
        { message: 'Robot creado correctamente.', data: robot },
        { status: 201 }
      )
    );
  } catch (error) {
    if (error instanceof ValidationError) {
      return createJsonErrorResponse({
        message: error.errors.join(', '),
        status: 400,
      });
    }

    return createJsonErrorResponse({});
  }
}
