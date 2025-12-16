import prisma from '@/libs/prisma';

interface GetRobotsParams {
  skip: number;
  take: number;
}

export async function getRobots({ skip, take }: GetRobotsParams) {
  const [total, robots] = await Promise.all([
    prisma.robots.count({
      where: {
        status: 'active',
      },
    }),
    prisma.robots.findMany({
      skip,
      take,
      where: {
        status: 'active',
      },
      orderBy: {
        created_at: 'desc',
      },
      select: {
        id: true,
        name: true,
        control_type: true,
        wins: true,
        losses: true,
        matches_played: true,
        categories: {
          select: {
            id: true,
            name: true,
          },
        },
        competitors: {
          select: {
            user: {
              select: {
                id: true,
                name: true,
                lastName: true,
                email: true,
                nickname: true,
              },
            },
          },
        },
      },
    }),
  ]);

  return { total, robots };
}

export async function getRobotsAdmin({ skip, take }: GetRobotsParams) {
  const [total, robots] = await Promise.all([
    prisma.robots.count(),
    prisma.robots.findMany({
      skip,
      take,
      orderBy: {
        created_at: 'desc',
      },
      select: {
        id: true,
        name: true,
        control_type: true,
        wins: true,
        losses: true,
        matches_played: true,
        status: true,
        created_at: true,
        updated_at: true,
        categories: {
          select: {
            id: true,
            name: true,
          },
        },
        competitors: {
          select: {
            user: {
              select: {
                id: true,
                name: true,
                lastName: true,
                email: true,
                nickname: true,
              },
            },
          },
        },
      },
    }),
  ]);

  return { total, robots };
}
