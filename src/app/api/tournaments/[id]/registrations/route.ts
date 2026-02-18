import { NextRequest, NextResponse } from 'next/server';
import { applyCorsHeaders, handleCorsOptions } from '@/libs/cors';
import { createJsonErrorResponse } from '@/helpers/createJsonErrorResponse';
import { getRegistrations } from '@/service/registration';
import { validateTournamentExists } from '@/service/tournament';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}

// Listar inscripciones de un torneo
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const tournamentId = Number(id);

    if (isNaN(tournamentId)) {
      return createJsonErrorResponse({
        request,
        message: 'El ID del torneo debe ser un número válido.',
        status: 400,
      });
    }

    // Validar que el torneo existe
    const existsValidation = await validateTournamentExists(tournamentId);
    if (existsValidation.error) {
      return createJsonErrorResponse({
        request,
        message: existsValidation.error,
        status: existsValidation.status!,
      });
    }

    const { searchParams } = new URL(request.url);
    const skip = Number(searchParams.get('skip') ?? 0);
    const take = Number(searchParams.get('take') ?? 50);

    const { total, registrations } = await getRegistrations({
      tournament_id: tournamentId,
      skip,
      take,
    });

    return applyCorsHeaders(
      request,
      NextResponse.json({
        message: 'Inscripciones obtenidas exitosamente',
        total,
        data: registrations,
      })
    );
  } catch {
    return createJsonErrorResponse({ request });
  }
}
