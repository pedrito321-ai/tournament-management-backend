import prisma from '@/libs/prisma';

export async function getCategory({ numericId }: { numericId: number }) {
  return await prisma.categories.findFirst({
    where: { id: numericId },
  });
}
