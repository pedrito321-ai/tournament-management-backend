import prisma from '@/libs/prisma';

interface GetRegistrationsParams {
  tournament_id: number;
  skip?: number;
  take?: number;
}

/**
 * Obtiene las inscripciones de un torneo
 */
export const getRegistrations = async ({
  tournament_id,
  skip = 0,
  take = 50,
}: GetRegistrationsParams) => {
  const [total, registrations] = await Promise.all([
    prisma.tournament_registrations.count({
      where: { tournament_id },
    }),
    prisma.tournament_registrations.findMany({
      where: { tournament_id },
      skip,
      take,
      orderBy: { registered_at: 'desc' },
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
        categories: {
          select: { id: true, name: true },
        },
      },
    }),
  ]);

  return { total, registrations };
};
