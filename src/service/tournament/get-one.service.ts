import prisma from '@/libs/prisma';

/**
 * Obtiene un torneo por ID con toda su información relacionada
 */
export const getTournament = async (tournamentId: number) => {
  const tournament = await prisma.tournaments.findFirst({
    where: { id: tournamentId, status: { not: 'cancelled' }  },
    include: {
      category: {
        select: { id: true, name: true, description: true },
      },
      judges: {
        include: {
          judges: {
            include: {
              user: {
                select: { id: true, name: true, lastName: true, email: true },
              },
            },
          },
        },
      },
      tournamentClubs: {
        include: {
          club: {
            select: { id: true, name: true },
          },
        },
      },
      registrations: {
        include: {
          competitors: {
            include: {
              user: {
                select: { id: true, name: true, lastName: true, nickname: true },
              },
              club: {
                select: { id: true, name: true },
              },
            },
          },
          robots: {
            select: { id: true, name: true, status: true, control_type: true },
          },
        },
      },
      matches: {
        orderBy: [{ round_number: 'asc' }, { id: 'asc' }],
        include: {
          competitorA: {
            include: {
              user: {
                select: { id: true, name: true, lastName: true },
              },
            },
          },
          competitorB: {
            include: {
              user: {
                select: { id: true, name: true, lastName: true },
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
      },
      results: {
        orderBy: { position: 'asc' },
        include: {
          competitors: {
            include: {
              user: {
                select: { id: true, name: true, lastName: true },
              },
            },
          },
          robots: {
            select: { id: true, name: true },
          },
        },
      },
      tournament_prizes: {
        include: {
          competitor: {
            include: {
              user: {
                select: { id: true, name: true, lastName: true },
              },
            },
          },
          club: {
            select: { id: true, name: true },
          },
        },
      },
    },
  });

  return tournament;
};
