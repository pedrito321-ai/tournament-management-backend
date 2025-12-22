import prisma from '@/libs/prisma';

interface GenerateBracketsDTO {
  tournamentId: number;
  judgeId: number;
  combatDurationSec: number;
}

/**
 * Genera los cruces automáticos del torneo (eliminación directa)
 * - Obtiene inscripciones aprobadas
 * - Mezcla aleatoriamente los competidores
 * - Crea combates de primera ronda
 */
export const generateBrackets = async ({
  tournamentId,
  judgeId,
  combatDurationSec,
}: GenerateBracketsDTO) => {
  return await prisma.$transaction(async (tx) => {
    // Validar estado dentro de la transacción para evitar condiciones de carrera (double-submit)
    const tournament = await tx.tournaments.findUnique({
      where: { id: tournamentId },
      select: { status: true }
    });

    if (!tournament || tournament.status !== 'draft') {
      throw new Error('El torneo ya ha sido iniciado o no se encuentra en estado borrador.');
    }

    // Obtener inscripciones aprobadas
    const registrations = await tx.tournament_registrations.findMany({
      where: {
        tournament_id: tournamentId,
        // TODO: Evaluar si es necesario aprobar la inscripción (`is_approved`) o si basta con registrar al competidor para iniciar la pelea.
        // is_approved: true,
      },
      include: {
        competitors: true,
      },
    });

    if (registrations.length < 2) {
      throw new Error('Se necesitan al menos 2 competidores para iniciar el torneo.');
    }

    // Mezclar aleatoriamente (Fisher-Yates shuffle)
    const shuffled = [...registrations];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Crear combates de primera ronda
    const matches = [];
    for (let i = 0; i < shuffled.length; i += 2) {
      if (i + 1 < shuffled.length) {
        const match = await tx.tournament_matches.create({
          data: {
            tournament_id: tournamentId,
            round_number: 1,
            competitor_a: shuffled[i].competitor_id,
            competitor_b: shuffled[i + 1].competitor_id,
            judge_id: judgeId,
            duration_sec: combatDurationSec,
            status: 'pending',
          },
        });
        matches.push(match);
      }
    }

    // Actualizar el estado del torneo a activo
    await tx.tournaments.update({
      where: { id: tournamentId },
      data: { status: 'active' },
    });

    return { matches, totalCompetitors: shuffled.length };
  });
};

/**
 * Obtiene el juez asignado al torneo
 */
export const getTournamentJudge = async (tournamentId: number) => {
  const tournamentJudge = await prisma.tournament_judges.findFirst({
    where: { tournament_id: tournamentId },
    include: {
      judges: true,
    },
  });

  return tournamentJudge?.judges ?? null;
};
