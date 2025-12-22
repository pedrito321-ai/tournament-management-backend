import prisma from '@/libs/prisma';

interface GetMatchesParams {
  tournament_id: number;
  round_number?: number;
}

/**
 * Obtiene los combates de un torneo
 */
export const getMatches = async ({
  tournament_id,
  round_number,
}: GetMatchesParams) => {
  const where = {
    tournament_id,
    ...(round_number !== undefined && { round_number }),
  };

  const matches = await prisma.tournament_matches.findMany({
    where,
    orderBy: [{ round_number: 'asc' }, { id: 'asc' }],
    include: {
      competitorA: {
        include: {
          user: {
            select: { id: true, name: true, lastName: true, nickname: true },
          },
          club: {
            select: { id: true, name: true },
          },
        },
      },
      competitorB: {
        include: {
          user: {
            select: { id: true, name: true, lastName: true, nickname: true },
          },
          club: {
            select: { id: true, name: true },
          },
        },
      },
      judge: {
        include: {
          user: {
            select: { id: true, name: true, lastName: true },
          },
        },
      },
    },
  });

  return matches;
};
