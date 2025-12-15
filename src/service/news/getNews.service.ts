import prisma from '@/libs/prisma';

export async function getNews({
  skip = 0,
  take = 10,
}: {
  skip?: number;
  take?: number;
}) {
  return prisma.news.findMany({
    skip,
    take,
    orderBy: { created_at: 'desc' },
    include: {
      publishedBy: {
        select: {
          id: true,
          name: true,
          lastName: true,
          nickname: true,
          email: true,
          profile_picture: true,
        },
      },
      categories: {
        select: {
          categories: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });
}
