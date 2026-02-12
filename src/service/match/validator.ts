import prisma from '@/libs/prisma';

interface ValidationResult {
  error?: string;
  status?: number;
}

/**
 * Valida que el combate existe
 */
export const validateMatchExists = async (
  matchId: number
): Promise<ValidationResult & { match?: Awaited<ReturnType<typeof prisma.tournament_matches.findUnique>> }> => {
  const match = await prisma.tournament_matches.findUnique({
    where: { id: matchId },
    include: {
      tournament: true,
      competitorA: {
        include: { user: true },
      },
      competitorB: {
        include: { user: true },
      },
      judge: {
        include: { user: true },
      },
    },
  });

  if (!match) {
    return {
      error: `El combate con ID ${matchId} no existe.`,
      status: 404,
    };
  }

  return { match };
};

/**
 * Valida que el ganador es uno de los participantes del combate
 */
export const validateWinnerIsParticipant = (
  winnerId: number,
  competitorAId: number,
  competitorBId: number
): ValidationResult => {
  if (winnerId !== competitorAId && winnerId !== competitorBId) {
    return {
      error: 'El ganador debe ser uno de los competidores del combate.',
      status: 400,
    };
  }

  return {};
};

/**
 * Valida que el combate no está finalizado
 */
export const validateMatchNotFinished = (
  matchStatus: string
): ValidationResult => {
  if (matchStatus === 'finished') {
    return {
      error: 'Este combate ya ha finalizado.',
      status: 400,
    };
  }

  return {};
};

/**
 * Valida que el usuario puede registrar resultados (judge o admin)
 */
export const validateCanSetResult = async (
  userId: number,
  userRole: string,
  matchJudgeUserId: number
): Promise<ValidationResult> => {
  if (userRole === 'admin') {
    return {};
  }

  if (userRole === 'judge' && Number(userId) === matchJudgeUserId) {
    return {};
  }

  return {
    error: 'Solo el juez asignado o un administrador pueden registrar resultados.',
    status: 403,
  };
};

/**
 * Valida que el torneo está activo para registrar resultados
 */
export const validateTournamentIsActive = async (
  tournamentId: number
): Promise<ValidationResult> => {
  const tournament = await prisma.tournaments.findUnique({
    where: { id: tournamentId },
    select: { status: true },
  });

  if (!tournament) {
    return {
      error: 'El torneo no existe.',
      status: 404,
    };
  }

  if (tournament.status !== 'active') {
    return {
      error: 'Solo se pueden registrar resultados en torneos activos.',
      status: 400,
    };
  }

  return {};
};
