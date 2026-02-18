import { verifyAuth } from '@/libs/auth';
import { NextRequest, NextResponse } from 'next/server';
import { applyCorsHeaders, handleCorsOptions } from '@/libs/cors';
import { createJsonErrorResponse } from '@/helpers/createJsonErrorResponse';
import { validateTournamentExists } from '@/service/tournament';
import { generateBrackets, getTournamentJudge } from '@/service/match';
import prisma from '@/libs/prisma';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}

// Iniciar torneo y generar brackets (solo admin)
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = verifyAuth(request);
    if (!auth.valid) return auth.response;

    const userRole = auth.decoded?.role;

    if (userRole !== 'admin') {
      return createJsonErrorResponse({
        request,
        message: 'Solo los administradores pueden iniciar torneos.',
        status: 403,
      });
    }

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

    const tournament = existsValidation.tournament!;

    // Validar que el torneo está en estado draft
    if (tournament.status !== 'draft') {
      return createJsonErrorResponse({
        request,
        message: 'Solo se pueden iniciar torneos en estado borrador (draft).',
        status: 400,
      });
    }

    // Validar que hay suficientes inscripciones aprobadas
    const approvedRegistrations = await prisma.tournament_registrations.count({
      where: {
        tournament_id: tournamentId,
        // TODO: Evaluar si es necesario aprobar la inscripción (`is_approved`) o si basta con registrar al competidor para iniciar la pelea.
        // is_approved: true,
      },
    });

    if (approvedRegistrations < 2) {
      return createJsonErrorResponse({
        request,
        message: 'Se necesitan al menos 2 inscripciones aprobadas para iniciar el torneo.',
        status: 400,
      });
    }

    // Obtener el juez del torneo
    const judge = await getTournamentJudge(tournamentId);
    if (!judge) {
      return createJsonErrorResponse({
        request,
        message: 'No hay un juez asignado al torneo.',
        status: 400,
      });
    }

    // Generar brackets
    const result = await generateBrackets({
      tournamentId,
      judgeId: judge.id,
      combatDurationSec: 1800, // 30 minutos por defecto
    });

    return applyCorsHeaders(
      request,
      NextResponse.json({
        message: 'Torneo iniciado exitosamente. Brackets generados.',
        data: {
          matches: result.matches,
          totalCompetitors: result.totalCompetitors,
        },
      }),
    );
  } catch (error) {
    if (error instanceof Error) {
      return createJsonErrorResponse({
        request,
        message: error.message,
        status: 400,
      });
    }

    return createJsonErrorResponse({ request });
  }
}
