import prisma from '@/libs/prisma';

interface ValidationResult {
  error?: string;
  status?: number;
}

/**
 * Valida que la categoría existe
 */
export const validateCategoryExists = async (
  categoryId: number
): Promise<ValidationResult> => {
  const category = await prisma.categories.findUnique({
    where: { id: categoryId },
  });

  if (!category) {
    return {
      error: `La categoría con ID ${categoryId} no existe.`,
      status: 404,
    };
  }

  return {};
};

/**
 * Valida que el juez es válido para el torneo:
 * - Tiene rol judge
 * - Tiene la categoría del torneo asignada
 */
export const validateJudgeForTournament = async (
  judgeId: number,
  categoryId: number
): Promise<ValidationResult> => {
  const judge = await prisma.judges.findUnique({
    where: { id: judgeId },
    include: {
      user: true,
      categories: {
        where: { category_id: categoryId },
      },
    },
  });

  if (!judge) {
    return {
      error: `El juez con ID ${judgeId} no existe.`,
      status: 404,
    };
  }

  if (judge.user.role !== 'judge') {
    return {
      error: 'El usuario especificado no tiene rol de juez.',
      status: 400,
    };
  }

  if (!judge.is_approved) {
    return {
      error: 'El juez no está aprobado.',
      status: 400,
    };
  }

  if (judge.categories.length === 0) {
    return {
      error: 'El juez no tiene asignada la categoría de este torneo.',
      status: 400,
    };
  }

  return {};
};

/**
 * Valida que los clubes existen y están aprobados
 */
export const validateAllowedClubs = async (
  clubIds: number[]
): Promise<ValidationResult> => {
  const clubs = await prisma.clubs.findMany({
    where: { id: { in: clubIds } },
    select: { id: true, is_approved: true, name: true },
  });

  // Verificar que todos los clubes existen
  const foundIds = clubs.map((c) => c.id);
  const missingIds = clubIds.filter((id) => !foundIds.includes(id));

  if (missingIds.length > 0) {
    return {
      error: `Los siguientes clubes no existen: ${missingIds.join(', ')}`,
      status: 404,
    };
  }

  // Verificar que todos los clubes están aprobados
  const notApproved = clubs.filter((c) => !c.is_approved);

  if (notApproved.length > 0) {
    const names = notApproved.map((c) => c.name).join(', ');
    return {
      error: `Los siguientes clubes no están aprobados: ${names}`,
      status: 400,
    };
  }

  return {};
};

/**
 * Valida que el torneo existe
 */
export const validateTournamentExists = async (
  tournamentId: number
): Promise<ValidationResult & { tournament?: Awaited<ReturnType<typeof prisma.tournaments.findUnique>> }> => {
  const tournament = await prisma.tournaments.findUnique({
    where: { id: tournamentId },
    include: {
      category: true,
      judges: true,
      registrations: true,
    },
  });

  if (!tournament) {
    return {
      error: `El torneo con ID ${tournamentId} no existe.`,
      status: 404,
    };
  }

  return { tournament };
};

/**
 * Valida que el torneo está en estado draft
 */
export const validateTournamentIsDraft = async (
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
      error: 'Solo se pueden modificar torneos en estado borrador (draft).',
      status: 400,
    };
  }

  return {};
};
