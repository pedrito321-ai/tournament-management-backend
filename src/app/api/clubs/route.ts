import { createJsonErrorResponse } from '@/helpers/createJsonErrorResponse';
import { verifyAuth } from '@/libs/auth';
import { applyCorsHeaders, handleCorsOptions } from '@/libs/cors';
import prisma from '@/libs/prisma';
import { clubCreateSchema } from '@/schemas/club.schema';
import { getClubs, createClub } from '@/service/clubs';
import { NextRequest, NextResponse } from 'next/server';
import { ValidationError } from 'yup';

export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}

export async function GET(request: NextRequest) {
  try {
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

    const { total, clubs } = await getClubs({ take, skip });

    return applyCorsHeaders(
      request,
      NextResponse.json({
        total,
        data: clubs,
      })
    );
  } catch {
    return createJsonErrorResponse({ request });
  }
}

// Crear club (dueño del perfíl y admin)
export async function POST(request: NextRequest) {
  try {
    const auth = verifyAuth(request);
    if (!auth.valid) return auth.response;

    const userRole = auth.decoded?.role;
    const userId = auth.decoded?.id;

    if (userRole !== 'club_owner' && userRole !== 'admin') {
      return createJsonErrorResponse({
        request,
        message:
          'Solo los propietarios de club y administradores pueden crear un club.',
        status: 403,
      });
    }

    const { name, fiscal_address, logo, owner_id } =
      await clubCreateSchema.validate(await request.json());

    let finalOwnerId: number;

    if (userRole === 'club_owner') {
      finalOwnerId = Number(userId); // El dueño del club crea el club → owner_id automático
    } else {
      if (!owner_id) {
        return createJsonErrorResponse({
          request,
          message: 'El administrador debe especificar el owner_id del club.',
          status: 400,
        });
      }

      finalOwnerId = Number(owner_id); // El admin crea el club → owner_id debe venir del body

      const clubOwner = await prisma.users.findFirst({
        where: { club_owner: { user_id: finalOwnerId } },
      });

      if (!clubOwner) {
        return createJsonErrorResponse({
          request,
          message:
            'No se encontró un usuario con rol dueño de club con ese ID.',
          status: 400,
        });
      }
    }

    const newClub = await createClub({
      owner_id: finalOwnerId,
      name,
      fiscal_address,
      logo: logo ?? null,
    });

    return applyCorsHeaders(
      request,
      NextResponse.json({
        message: 'Club creado correctamente.',
        data: newClub,
      })
    );
  } catch (error) {
    if (error instanceof ValidationError) {
      return createJsonErrorResponse({
        request,
        message: error.errors.join(', '),
        status: 400,
      });
    }

    return createJsonErrorResponse({ request });
  }
}
