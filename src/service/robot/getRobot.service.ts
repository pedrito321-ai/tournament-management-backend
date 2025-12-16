import prisma from '@/libs/prisma';

export async function getRobot({ id }: { id: number }) {
  return prisma.robots.findUnique({
    where: { id, status: 'active' },
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
  });
}

export async function getRobotAdmin({ id }: { id: number }) {
  return prisma.robots.findUnique({
    where: { id },
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
  });
}
