import prisma from '@/libs/prisma';

interface ValidationResult {
  error?: string;
  status?: number;
}

const BLOCK_DAYS = 7;

/**
 * Valida que el usuario es un competidor
 */
export const validateIsCompetitor = async (
  userId: number
): Promise<ValidationResult & { competitor?: Awaited<ReturnType<typeof prisma.competitors.findUnique>> }> => {
  const competitor = await prisma.competitors.findUnique({
    where: { user_id: userId },
    include: {
      user: true,
      club: true,
    },
  });

  if (!competitor) {
    return {
      error: 'El usuario no es un competidor registrado.',
      status: 403,
    };
  }

  if (competitor.user.role !== 'competitor') {
    return {
      error: 'El usuario no tiene rol de competidor.',
      status: 403,
    };
  }

  if (!competitor.is_approved) {
    return {
      error: 'El competidor no está aprobado.',
      status: 403,
    };
  }

  return { competitor };
};

/**
 * Valida que el club del competidor está aprobado
 */
export const validateCompetitorClub = async (
  clubId: number
): Promise<ValidationResult> => {
  const club = await prisma.clubs.findUnique({
    where: { id: clubId },
    select: { is_approved: true, name: true },
  });

  if (!club) {
    return {
      error: 'El club del competidor no existe.',
      status: 404,
    };
  }

  if (!club.is_approved) {
    return {
      error: `El club "${club.name}" no está aprobado.`,
      status: 403,
    };
  }

  return {};
};

/**
 * Valida que el club está en la lista de clubes habilitados para el torneo
 * verificamos que el club esté aprobado y exista
 */
export const validateClubAllowedInTournament = async (
  clubId: number,
  _tournamentId: number
): Promise<ValidationResult> => {
  // Verificar que el club está aprobado
  const club = await prisma.clubs.findUnique({
    where: { id: clubId },
    select: { is_approved: true },
  });

  if (!club || !club.is_approved) {
    return {
      error: 'El club no está habilitado para participar en torneos.',
      status: 403,
    };
  }

  return {};
};

/**
 * Valida que ningún otro miembro del mismo club esté inscrito
 */
export const validateNoOtherClubMember = async (
  tournamentId: number,
  clubId: number
): Promise<ValidationResult> => {
  const existingRegistration = await prisma.tournament_registrations.findFirst({
    where: {
      tournament_id: tournamentId,
      club_id: clubId,
    },
  });

  if (existingRegistration) {
    return {
      error: 'Ya existe otro competidor de este club inscrito en el torneo.',
      status: 409,
    };
  }

  return {};
};

/**
 * Valida que el robot es de la categoría del torneo
 */
export const validateRobotCategory = async (
  robotId: number,
  competitorId: number,
  tournamentCategoryId: number
): Promise<ValidationResult & { robot?: Awaited<ReturnType<typeof prisma.robots.findUnique>> }> => {
  const robot = await prisma.robots.findUnique({
    where: { id: robotId },
    include: { categories: true },
  });

  if (!robot) {
    return {
      error: `El robot con ID ${robotId} no existe.`,
      status: 404,
    };
  }

  if (robot.competitor_id !== competitorId) {
    return {
      error: 'Este robot no pertenece al competidor.',
      status: 403,
    };
  }

  if (robot.category_id !== tournamentCategoryId) {
    return {
      error: 'El robot no es de la categoría del torneo.',
      status: 400,
    };
  }

  if (robot.status !== 'active') {
    return {
      error: 'El robot no está activo.',
      status: 400,
    };
  }

  return { robot };
};

/**
 * Valida que el torneo no esté lleno
 */
export const validateTournamentNotFull = async (
  tournamentId: number
): Promise<ValidationResult> => {
  const tournament = await prisma.tournaments.findUnique({
    where: { id: tournamentId },
    select: { max_participants: true },
  });

  if (!tournament) {
    return {
      error: `El torneo con ID ${tournamentId} no existe.`,
      status: 404,
    };
  }

  const registrationCount = await prisma.tournament_registrations.count({
    where: { tournament_id: tournamentId },
  });

  if (registrationCount >= tournament.max_participants) {
    return {
      error: 'El torneo ha alcanzado el máximo de participantes.',
      status: 400,
    };
  }

  return {};
};

/**
 * Valida que el competidor no esté bloqueado (7 días después del último torneo)
 */
export const validateCompetitorNotBlocked = async (
  competitorId: number
): Promise<ValidationResult> => {
  const competitor = await prisma.competitors.findUnique({
    where: { user_id: competitorId },
    select: { last_tournament_end: true },
  });

  if (!competitor) {
    return {
      error: 'Competidor no encontrado.',
      status: 404,
    };
  }

  if (competitor.last_tournament_end) {
    const blockEndDate = new Date(competitor.last_tournament_end);
    blockEndDate.setDate(blockEndDate.getDate() + BLOCK_DAYS);

    if (new Date() < blockEndDate) {
      const daysLeft = Math.ceil(
        (blockEndDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );
      return {
        error: `El competidor está bloqueado por ${daysLeft} día(s) más después de su último torneo.`,
        status: 403,
      };
    }
  }

  return {};
};

/**
 * Valida que el torneo esté en estado draft o active para inscripciones
 */
export const validateTournamentOpenForRegistration = async (
  tournamentId: number
): Promise<ValidationResult> => {
  const tournament = await prisma.tournaments.findUnique({
    where: { id: tournamentId },
    select: { status: true },
  });

  if (!tournament) {
    return {
      error: `El torneo con ID ${tournamentId} no existe.`,
      status: 404,
    };
  }

  if (tournament.status !== 'draft') {
    return {
      error: 'El torneo no está abierto para inscripciones.',
      status: 400,
    };
  }

  return {};
};

/**
 * Valida que el competidor no esté ya inscrito en el torneo
 */
export const validateNotAlreadyRegistered = async (
  tournamentId: number,
  competitorId: number
): Promise<ValidationResult> => {
  const existing = await prisma.tournament_registrations.findFirst({
    where: {
      tournament_id: tournamentId,
      competitor_id: competitorId,
    },
  });

  if (existing) {
    return {
      error: 'El competidor ya está inscrito en este torneo.',
      status: 409,
    };
  }

  return {};
};
