import prisma from '@/libs/prisma';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Actualiza los puntajes acumulativos de un competidor y su club
 */
export const updateScores = async (
  competitorId: number,
  clubId: number,
  points: number
) => {
  return await prisma.$transaction(async (tx) => {
    // Actualizar puntaje del competidor
    const competitorScore = await tx.competitor_scores.upsert({
      where: { competitor_id: competitorId },
      update: {
        total_points: { increment: points },
      },
      create: {
        competitor_id: competitorId,
        total_points: new Decimal(points),
      },
    });

    // Actualizar puntaje del club
    const clubScore = await tx.club_scores.upsert({
      where: { club_id: clubId },
      update: {
        total_points: { increment: points },
      },
      create: {
        club_id: clubId,
        total_points: new Decimal(points),
      },
    });

    return { competitorScore, clubScore };
  });
};

/**
 * Recalcula el puntaje total de un club sumando los puntajes de sus competidores
 */
export const recalculateClubScore = async (clubId: number) => {
  const competitors = await prisma.competitors.findMany({
    where: { club_id: clubId },
    select: { user_id: true },
  });

  const competitorIds = competitors.map((c) => c.user_id);

  const totalPoints = await prisma.competitor_scores.aggregate({
    where: { competitor_id: { in: competitorIds } },
    _sum: { total_points: true },
  });

  const clubScore = await prisma.club_scores.upsert({
    where: { club_id: clubId },
    update: {
      total_points: totalPoints._sum.total_points ?? new Decimal(0),
    },
    create: {
      club_id: clubId,
      total_points: totalPoints._sum.total_points ?? new Decimal(0),
    },
  });

  return clubScore;
};
