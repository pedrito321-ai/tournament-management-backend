import prisma from '@/libs/prisma';
import { tournament_status } from '@prisma/client';

interface GetTournamentsParams {
  skip: number;
  take: number;
  status?: tournament_status;
  category_id?: number;
}

/**
 * Obtiene listado de torneos con paginación y filtros
 */
export const getTournaments = async ({
  skip,
  take,
  status,
  category_id,
}: GetTournamentsParams) => {
  const where = {
    ...(status
      ? { status } // si el frontend envía status, se respeta
      : { status: { not: tournament_status.cancelled } }), // por defecto excluir cancelados
    ...(category_id && { category_id }),
  };

  const [total, tournaments] = await Promise.all([
    prisma.tournaments.count({ where }),
    prisma.tournaments.findMany({
      where,
      skip,
      take,
      orderBy: { created_at: 'desc' },
      include: {
        category: {
          select: { id: true, name: true },
        },
        judges: {
          include: {
            judges: {
              include: {
                user: {
                  select: { id: true, name: true, lastName: true },
                },
              },
            },
          },
        },
        _count: {
          select: { registrations: true },
        },
      },
    }),
  ]);

  return { total, tournaments };
};
