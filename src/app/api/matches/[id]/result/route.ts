import { verifyAuth } from '@/libs/auth';
import { NextRequest, NextResponse } from 'next/server';
import { applyCorsHeaders, handleCorsOptions } from '@/libs/cors';
import { setMatchResultSchema } from '@/schemas/match.schema';
import { ValidationError } from 'yup';
import { createJsonErrorResponse } from '@/helpers/createJsonErrorResponse';
import {
  setMatchResult,
  validateMatchExists,
  validateWinnerIsParticipant,
  validateMatchNotFinished,
  validateCanSetResult,
  validateTournamentIsActive,
} from '@/service/match';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function OPTIONS() {
  return handleCorsOptions();
}

// Registrar resultado de un combate (solo judge o admin)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = verifyAuth(request);
    if (!auth.valid) return auth.response;

    const userRole = auth.decoded?.role;
    const userId = Number(auth.decoded?.id);

    if (userRole !== 'judge' && userRole !== 'admin') {
      return createJsonErrorResponse({
        message: 'Solo jueces o administradores pueden registrar resultados.',
        status: 403,
      });
    }

    const { id } = await params;
    const matchId = Number(id);

    if (isNaN(matchId)) {
      return createJsonErrorResponse({
        message: 'El ID del combate debe ser un número válido.',
        status: 400,
      });
    }

    // Validar que el combate existe
    const matchValidation = await validateMatchExists(matchId);
    if (matchValidation.error) {
      return createJsonErrorResponse({
        message: matchValidation.error,
        status: matchValidation.status!,
      });
    }

    const match = matchValidation.match!;

    // Validar que el combate no está finalizado
    const notFinishedValidation = validateMatchNotFinished(match.status);
    if (notFinishedValidation.error) {
      return createJsonErrorResponse({
        message: notFinishedValidation.error,
        status: notFinishedValidation.status!,
      });
    }

    // Validar que el torneo está activo
    const activeValidation = await validateTournamentIsActive(match.tournament_id);
    if (activeValidation.error) {
      return createJsonErrorResponse({
        message: activeValidation.error,
        status: activeValidation.status!,
      });
    }

    // Validar que el usuario puede registrar resultados
    const canSetResultValidation = await validateCanSetResult(
      userId,
      userRole,
      match.judge_id
    );
    if (canSetResultValidation.error) {
      return createJsonErrorResponse({
        message: canSetResultValidation.error,
        status: canSetResultValidation.status!,
      });
    }

    const body = await request.json();

    const validatedData = await setMatchResultSchema.validate(body, {
      abortEarly: false,
    });

    // Validar que el ganador es uno de los participantes
    const winnerValidation = validateWinnerIsParticipant(
      validatedData.winner_id,
      match.competitor_a,
      match.competitor_b
    );
    if (winnerValidation.error) {
      return createJsonErrorResponse({
        message: winnerValidation.error,
        status: winnerValidation.status!,
      });
    }

    // Registrar el resultado
    const updatedMatch = await setMatchResult({
      matchId,
      winner_id: validatedData.winner_id,
      victory_type: validatedData.victory_type,
    });

    return applyCorsHeaders(
      NextResponse.json({
        message: 'Resultado registrado exitosamente',
        data: updatedMatch,
      })
    );
  } catch (error) {
    if (error instanceof ValidationError) {
      return applyCorsHeaders(
        NextResponse.json({ error: error.errors }, { status: 400 })
      );
    }

    if (error instanceof Error) {
      return createJsonErrorResponse({
        message: error.message,
        status: 400,
      });
    }

    return createJsonErrorResponse({});
  }
}
