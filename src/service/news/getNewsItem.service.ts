import prisma from '@/libs/prisma';

export async function getNewsItem({ id }: { id: number }) {
  return prisma.news.findUnique({
    where: { id },
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
