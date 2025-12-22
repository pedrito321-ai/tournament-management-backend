import prisma from '@/libs/prisma';
import { SetMatchResultBody } from '@/types/match.types';

interface SetMatchResultDTO extends SetMatchResultBody {
  matchId: number;
}

const POINTS_PER_WIN = 10;

/**
 * Registra el resultado de un combate
 * - Actualiza el ganador y tipo de victoria
 * - Actualiza estadísticas del robot
 * - Genera siguiente ronda si corresponde
 * - Si es final, marca torneo como finalizado
 */
export const setMatchResult = async ({
  matchId,
  winner_id,
  victory_type,
}: SetMatchResultDTO) => {
  return await prisma.$transaction(async (tx) => {
    // Obtener el combate
    const match = await tx.tournament_matches.findUnique({
      where: { id: matchId },
      include: {
        tournament: {
          include: {
            registrations: true,
          },
        },
        competitorA: true,
        competitorB: true,
      },
    });

    if (!match) {
      throw new Error('Combate no encontrado');
    }

    const loserId = winner_id === match.competitor_a 
      ? match.competitor_b 
      : match.competitor_a;

    // Actualizar el combate
    const updatedMatch = await tx.tournament_matches.update({
      where: { id: matchId },
      data: {
        winner_id,
        victory_type,
        status: 'finished',
      },
    });

    // Obtener los registros para actualizar estadísticas de robots
    const winnerRegistration = await tx.tournament_registrations.findFirst({
      where: {
        tournament_id: match.tournament_id,
        competitor_id: winner_id,
      },
    });

    const loserRegistration = await tx.tournament_registrations.findFirst({
      where: {
        tournament_id: match.tournament_id,
        competitor_id: loserId,
      },
    });

    // Actualizar estadísticas del robot ganador
    if (winnerRegistration) {
      await tx.robots.update({
        where: { id: winnerRegistration.robot_id },
        data: {
          wins: { increment: 1 },
          matches_played: { increment: 1 },
        },
      });
    }

    // Actualizar estadísticas del robot perdedor
    if (loserRegistration) {
      await tx.robots.update({
        where: { id: loserRegistration.robot_id },
        data: {
          losses: { increment: 1 },
          matches_played: { increment: 1 },
        },
      });
    }

    // Verificar si hay más combates pendientes en esta ronda
    const pendingMatchesInRound = await tx.tournament_matches.count({
      where: {
        tournament_id: match.tournament_id,
        round_number: match.round_number,
        status: { not: 'finished' },
      },
    });

    // Si todos los combates de la ronda terminaron
    if (pendingMatchesInRound === 0) {
      // Obtener ganadores de la ronda
      const roundWinners = await tx.tournament_matches.findMany({
        where: {
          tournament_id: match.tournament_id,
          round_number: match.round_number,
          status: 'finished',
        },
        select: { winner_id: true },
      });

      const winnerIds = roundWinners
        .map((m) => m.winner_id)
        .filter((id): id is number => id !== null);

      // Si solo queda un ganador, el torneo terminó
      if (winnerIds.length === 1) {
        const tournamentWinnerId = winnerIds[0];
        
        // Obtener información del ganador
        const winnerReg = await tx.tournament_registrations.findFirst({
          where: {
            tournament_id: match.tournament_id,
            competitor_id: tournamentWinnerId,
          },
        });

        // Marcar el torneo como finalizado
        await tx.tournaments.update({
          where: { id: match.tournament_id },
          data: {
            status: 'finished',
            winner_competitor_id: tournamentWinnerId,
            winner_club_id: winnerReg?.club_id,
          },
        });

        // Crear premio para el ganador
        if (winnerReg) {
          await tx.tournament_prizes.create({
            data: {
              tournament_id: match.tournament_id,
              competitor_id: tournamentWinnerId,
              club_id: winnerReg.club_id,
              prize: 'Campeón del Torneo',
              victory_type: 'championship',
            },
          });

          // Actualizar puntaje del competidor
          await tx.competitor_scores.upsert({
            where: { competitor_id: tournamentWinnerId },
            update: {
              total_points: { increment: POINTS_PER_WIN * 3 }, // Bonus por ganar torneo
            },
            create: {
              competitor_id: tournamentWinnerId,
              total_points: POINTS_PER_WIN * 3,
            },
          });

          // Actualizar puntaje del club
          await tx.club_scores.upsert({
            where: { club_id: winnerReg.club_id },
            update: {
              total_points: { increment: POINTS_PER_WIN * 3 },
            },
            create: {
              club_id: winnerReg.club_id,
              total_points: POINTS_PER_WIN * 3,
            },
          });
        }

        // Aplicar bloqueo post-torneo a todos los competidores
        const allCompetitorIds = match.tournament.registrations.map(
          (r) => r.competitor_id
        );

        await tx.competitors.updateMany({
          where: { user_id: { in: allCompetitorIds } },
          data: { last_tournament_end: new Date() },
        });
      } else if (winnerIds.length > 1) {
        // Crear combates de la siguiente ronda
        const nextRound = match.round_number + 1;
        const tournamentJudge = await tx.tournament_judges.findFirst({
          where: { tournament_id: match.tournament_id },
        });

        for (let i = 0; i < winnerIds.length; i += 2) {
          if (i + 1 < winnerIds.length) {
            await tx.tournament_matches.create({
              data: {
                tournament_id: match.tournament_id,
                round_number: nextRound,
                competitor_a: winnerIds[i],
                competitor_b: winnerIds[i + 1],
                judge_id: tournamentJudge?.judge_id ?? match.judge_id,
                duration_sec: match.duration_sec,
                status: 'pending',
              },
            });
          }
        }
      }
    }

    // Actualizar puntaje del ganador del combate individual
    await tx.competitor_scores.upsert({
      where: { competitor_id: winner_id },
      update: {
        total_points: { increment: POINTS_PER_WIN },
      },
      create: {
        competitor_id: winner_id,
        total_points: POINTS_PER_WIN,
      },
    });

    // Actualizar puntaje del club del ganador
    if (winnerRegistration) {
      await tx.club_scores.upsert({
        where: { club_id: winnerRegistration.club_id },
        update: {
          total_points: { increment: POINTS_PER_WIN },
        },
        create: {
          club_id: winnerRegistration.club_id,
          total_points: POINTS_PER_WIN,
        },
      });
    }

    return updatedMatch;
  });
};
