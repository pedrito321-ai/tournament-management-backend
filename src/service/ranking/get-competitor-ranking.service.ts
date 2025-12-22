import prisma from '@/libs/prisma';

interface GetCompetitorRankingParams {
  skip?: number;
  take?: number;
}

/**
 * Obtiene el ranking de competidores ordenado por total_points
 */
export const getCompetitorRanking = async ({
  skip = 0,
  take = 50,
}: GetCompetitorRankingParams = {}) => {
  const [total, rankings] = await Promise.all([
    prisma.competitor_scores.count(),
    prisma.competitor_scores.findMany({
      skip,
      take,
      orderBy: { total_points: 'desc' },
    }),
  ]);

  // Enriquecer con información del competidor
  const enrichedRankings = await Promise.all(
    rankings.map(async (score, index) => {
      const competitor = await prisma.competitors.findUnique({
        where: { user_id: score.competitor_id },
        include: {
          user: {
            select: { id: true, name: true, lastName: true, nickname: true },
          },
          club: {
            select: { id: true, name: true },
          },
        },
      });

      return {
        position: skip + index + 1,
        competitor_id: score.competitor_id,
        total_points: score.total_points,
        competitor,
      };
    })
  );

  return { total, rankings: enrichedRankings };
};
