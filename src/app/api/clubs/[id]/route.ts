import { type NextRequest, NextResponse } from 'next/server';
import prisma from '@/libs/prisma';
import { verifyAuth } from '@/libs/auth';
import { clubs } from '@prisma/client';
import { ValidationError } from 'yup';
import { clubUpdateSchema } from '@/schemas/club.schema';
import { applyCorsHeaders, handleCorsOptions } from '@/libs/cors';
import { createJsonErrorResponse } from '@/helpers/createJsonErrorResponse';
import { getClub } from '@/service/clubs';

export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const numericId = Number(id);

    if (isNaN(numericId)) {
      return createJsonErrorResponse({
        request,
        message: 'ID debe ser un número válido.',
        status: 400,
      });
    }

    // obtener club
    const club = await getClub({ numericId });

    if (!club) {
      return createJsonErrorResponse({
        request,
        message: `El club con ID ${numericId} no existe`,
        status: 404,
      });
    }

    return applyCorsHeaders(request, NextResponse.json(club));
  } catch {
    return createJsonErrorResponse({ request });
  }
}

// Eliminar club (solo admin)
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
        message: 'Solo los administradores pueden eliminar clubes.',
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

    // Verificar si el club ya existe
    const existingClub = await prisma.clubs.findUnique({
      where: { id: numericId },
    });

    if (!existingClub) {
      return createJsonErrorResponse({
        request,
        message: `El club con ID ${numericId} no existe.`,
        status: 400,
      });
    }

    // Eliminar club
    await prisma.clubs.delete({
      where: { id: numericId },
    });

    return applyCorsHeaders(
      request,
      NextResponse.json({
        message: `El club con ID ${numericId} eliminado correctamente.`,
      }),
    );
  } catch {
    return createJsonErrorResponse({ request });
  }
}

// Actualizar club (solo admin)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verificar token
    const auth = verifyAuth(request);
    if (!auth.valid) return auth.response;

    // Verificar rol
    const userRole = auth.decoded?.role;
    const userId = auth.decoded?.id;

    if (userRole !== 'admin') {
      return createJsonErrorResponse({
        request,
        message: 'Solo los administradores pueden actualizar clubes.',
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

    // Verificar si el club ya existe
    const existingClub = await prisma.clubs.findUnique({
      where: { id: numericId },
    });

    if (!existingClub) {
      return createJsonErrorResponse({
        request,
        message: `El club con ID ${numericId} no existe.`,
        status: 400,
      });
    }

    // Validar los datos de entrada
    const { name, fiscal_address, logo, is_approved } =
      await clubUpdateSchema.validate(await request.json());

    // Preparar datos para actualizar
    const dataToUpdate: Partial<clubs> = {};

    // Agregar campos si se proporcionan
    if (name) dataToUpdate.name = name;
    if (fiscal_address) dataToUpdate.fiscal_address = fiscal_address;
    if (logo) dataToUpdate.logo = logo;

    if (typeof is_approved === 'boolean') {
      dataToUpdate.is_approved = is_approved;
      dataToUpdate.approved_by = Number(userId);
      dataToUpdate.approvedAt = new Date();
    }

    // Actualizar club
    const clubUpdate = await prisma.clubs.update({
      where: { id: numericId },
      data: dataToUpdate,
    });

    return applyCorsHeaders(
      request,
      NextResponse.json({
        message: `El club con ID ${numericId} actualizado correctamente.`,
        data: clubUpdate,
      }),
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
