import { verifyAuth } from '@/libs/auth';
import { NextRequest, NextResponse } from 'next/server';
import { applyCorsHeaders, handleCorsOptions } from '@/libs/cors';
import { updateTournamentSchema } from '@/schemas/tournament.schema';
import { ValidationError } from 'yup';
import { createJsonErrorResponse } from '@/helpers/createJsonErrorResponse';
import {
  getTournament,
  updateTournament,
  cancelTournament,
  validateTournamentExists,
  validateTournamentIsDraft,
} from '@/service/tournament';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function OPTIONS() {
  return handleCorsOptions();
}

// Obtener un torneo por ID
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const tournamentId = Number(id);

    if (isNaN(tournamentId)) {
      return createJsonErrorResponse({
        message: 'El ID del torneo debe ser un número válido.',
        status: 400,
      });
    }

    const tournament = await getTournament(tournamentId);

    if (!tournament) {
      return createJsonErrorResponse({
        message: `El torneo con ID ${tournamentId} no existe.`,
        status: 404,
      });
    }

    return applyCorsHeaders(
      NextResponse.json({
        message: 'Torneo obtenido exitosamente',
        data: tournament,
      })
    );
  } catch {
    return createJsonErrorResponse({});
  }
}

// Actualizar torneo (solo admin)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = verifyAuth(request);
    if (!auth.valid) return auth.response;

    const userRole = auth.decoded?.role;

    if (userRole !== 'admin') {
      return createJsonErrorResponse({
        message: 'Solo los administradores pueden actualizar torneos.',
        status: 403,
      });
    }

    const { id } = await params;
    const tournamentId = Number(id);

    if (isNaN(tournamentId)) {
      return createJsonErrorResponse({
        message: 'El ID del torneo debe ser un número válido.',
        status: 400,
      });
    }

    // Validar que el torneo existe
    const existsValidation = await validateTournamentExists(tournamentId);
    if (existsValidation.error) {
      return createJsonErrorResponse({
        message: existsValidation.error,
        status: existsValidation.status!,
      });
    }

    const body = await request.json();

    // Si no se está cambiando el estado, validar que el torneo está en draft
    if (!body.status) {
      const draftValidation = await validateTournamentIsDraft(tournamentId);
      if (draftValidation.error) {
        return createJsonErrorResponse({
          message: draftValidation.error,
          status: draftValidation.status!,
        });
      }
    }

    const validatedData = await updateTournamentSchema.validate(body, {
      abortEarly: false,
    });

    const tournament = await updateTournament({
      tournamentId,
      ...validatedData,
    });

    return applyCorsHeaders(
      NextResponse.json({
        message: 'Torneo actualizado exitosamente',
        data: tournament,
      })
    );
  } catch (error) {
    if (error instanceof ValidationError) {
      return applyCorsHeaders(
        NextResponse.json({ error: error.errors }, { status: 400 })
      );
    }

    return createJsonErrorResponse({});
  }
}

// Cancelar torneo (solo admin)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = verifyAuth(request);
    if (!auth.valid) return auth.response;

    const userRole = auth.decoded?.role;

    if (userRole !== 'admin') {
      return createJsonErrorResponse({
        message: 'Solo los administradores pueden cancelar torneos.',
        status: 403,
      });
    }

    const { id } = await params;
    const tournamentId = Number(id);

    if (isNaN(tournamentId)) {
      return createJsonErrorResponse({
        message: 'El ID del torneo debe ser un número válido.',
        status: 400,
      });
    }

    const existsValidation = await validateTournamentExists(tournamentId);
    if (existsValidation.error) {
      return createJsonErrorResponse({
        message: existsValidation.error,
        status: existsValidation.status!,
      });
    }

    const tournament = await cancelTournament(tournamentId);

    return applyCorsHeaders(
      NextResponse.json({
        message: 'Torneo cancelado exitosamente',
        data: tournament,
      })
    );
  } catch {
    return createJsonErrorResponse({});
  }
}
