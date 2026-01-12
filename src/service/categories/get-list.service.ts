import prisma from '@/libs/prisma';
import { PaginationParams } from '@/types';

export async function getCategories({ skip = 0, take = 10 }: PaginationParams) {
  const [total, categories] = await Promise.all([
    prisma.categories.count(),
    prisma.categories.findMany({
      skip,
      take,
    })
  ])

  return { total, categories }
}
