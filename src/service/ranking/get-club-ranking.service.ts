import prisma from '@/libs/prisma';

interface GetClubRankingParams {
  skip?: number;
  take?: number;
}

/**
 * Obtiene el ranking de clubes ordenado por total_points
 */
export const getClubRanking = async ({
  skip = 0,
  take = 50,
}: GetClubRankingParams = {}) => {
  const [total, rankings] = await Promise.all([
    prisma.club_scores.count(),
    prisma.club_scores.findMany({
      skip,
      take,
      orderBy: { total_points: 'desc' },
    }),
  ]);

  // Enriquecer con información del club
  const enrichedRankings = await Promise.all(
    rankings.map(async (score, index) => {
      const club = await prisma.clubs.findUnique({
        where: { id: score.club_id },
        select: {
          id: true,
          name: true,
          logo: true,
          owner: {
            select: { id: true, name: true, lastName: true },
          },
          _count: {
            select: { competitors: true },
          },
        },
      });

      return {
        position: skip + index + 1,
        club_id: score.club_id,
        total_points: score.total_points,
        club,
      };
    })
  );

  return { total, rankings: enrichedRankings };
};
