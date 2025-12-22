import { verifyAuth } from '@/libs/auth';
import { NextRequest, NextResponse } from 'next/server';
import { applyCorsHeaders, handleCorsOptions } from '@/libs/cors';
import { joinTournamentSchema } from '@/schemas/registration.schema';
import { ValidationError } from 'yup';
import { createJsonErrorResponse } from '@/helpers/createJsonErrorResponse';
import { validateTournamentExists } from '@/service/tournament';
import {
  joinTournament,
  validateIsCompetitor,
  validateCompetitorClub,
  validateNoOtherClubMember,
  validateRobotCategory,
  validateTournamentNotFull,
  validateCompetitorNotBlocked,
  validateTournamentOpenForRegistration,
  validateNotAlreadyRegistered,
} from '@/service/registration';

export async function OPTIONS() {
  return handleCorsOptions();
}

// Inscribirse a un torneo (solo competitor)
export async function POST(request: NextRequest) {
  try {
    const auth = verifyAuth(request);
    if (!auth.valid) return auth.response;

    const userRole = auth.decoded?.role;
    const userId = Number(auth.decoded?.id);

    if (userRole !== 'competitor') {
      return createJsonErrorResponse({
        message: 'Solo los competidores pueden inscribirse a torneos.',
        status: 403,
      });
    }

    const body = await request.json();

    const validatedData = await joinTournamentSchema.validate(body, {
      abortEarly: false,
    });

    const { tournament_id, robot_id } = validatedData;

    // Validar que el torneo existe
    const tournamentValidation = await validateTournamentExists(tournament_id);
    if (tournamentValidation.error) {
      return createJsonErrorResponse({
        message: tournamentValidation.error,
        status: tournamentValidation.status!,
      });
    }

    const tournament = tournamentValidation.tournament!;

    // Validar que el torneo está abierto para inscripciones
    const openValidation = await validateTournamentOpenForRegistration(
      tournament_id
    );
    if (openValidation.error) {
      return createJsonErrorResponse({
        message: openValidation.error,
        status: openValidation.status!,
      });
    }

    // Validar que el usuario es competidor
    const competitorValidation = await validateIsCompetitor(userId);
    if (competitorValidation.error) {
      return createJsonErrorResponse({
        message: competitorValidation.error,
        status: competitorValidation.status!,
      });
    }

    const competitor = competitorValidation.competitor!;

    // Validar que el club del competidor está aprobado
    const clubValidation = await validateCompetitorClub(competitor.club_id);
    if (clubValidation.error) {
      return createJsonErrorResponse({
        message: clubValidation.error,
        status: clubValidation.status!,
      });
    }

    // Validar que no hay otro miembro del mismo club inscrito
    const clubMemberValidation = await validateNoOtherClubMember(
      tournament_id,
      competitor.club_id
    );
    if (clubMemberValidation.error) {
      return createJsonErrorResponse({
        message: clubMemberValidation.error,
        status: clubMemberValidation.status!,
      });
    }

    // Validar que el robot es de la categoría del torneo
    const robotValidation = await validateRobotCategory(
      robot_id,
      userId,
      tournament.category_id
    );
    if (robotValidation.error) {
      return createJsonErrorResponse({
        message: robotValidation.error,
        status: robotValidation.status!,
      });
    }

    // Validar que el torneo no está lleno
    const fullValidation = await validateTournamentNotFull(tournament_id);
    if (fullValidation.error) {
      return createJsonErrorResponse({
        message: fullValidation.error,
        status: fullValidation.status!,
      });
    }

    // Validar que el competidor no está bloqueado
    const blockedValidation = await validateCompetitorNotBlocked(userId);
    if (blockedValidation.error) {
      return createJsonErrorResponse({
        message: blockedValidation.error,
        status: blockedValidation.status!,
      });
    }

    // Validar que el competidor no está ya inscrito
    const alreadyRegisteredValidation = await validateNotAlreadyRegistered(
      tournament_id,
      userId
    );
    if (alreadyRegisteredValidation.error) {
      return createJsonErrorResponse({
        message: alreadyRegisteredValidation.error,
        status: alreadyRegisteredValidation.status!,
      });
    }

    // Inscribir al competidor
    const registration = await joinTournament({
      tournament_id,
      robot_id,
      competitor_id: userId,
      club_id: competitor.club_id,
      category_id: tournament.category_id,
    });

    return applyCorsHeaders(
      NextResponse.json(
        {
          message: 'Inscripción realizada exitosamente. Pendiente de aprobación.',
          data: registration,
        },
        { status: 201 }
      )
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
