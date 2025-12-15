import prisma from '@/libs/prisma';

interface CreateNewsInput {
  title: string;
  content: string;
  image_url?: string | null;
  source_name?: string | null;
  source_link?: string | null;
  source_logo_url?: string | null;
  publishedById: number;
  categories?: number[];
}

export async function createNews({
  title,
  content,
  image_url = null,
  source_name = null,
  source_link = null,
  source_logo_url = null,
  categories,
  publishedById,
}: CreateNewsInput) {
  const newNews = await prisma.news.create({
    data: {
      title,
      content,
      image_url,
      published_by: publishedById,
      source_name,
      source_link,
      source_logo_url,
    },
  });

  // Relacionar categorías
  if (categories && categories.length > 0) {
    await prisma.news_categories.createMany({
      data: categories.map((categoryId) => ({
        news_id: newNews.id,
        category_id: categoryId,
      })),
    });
  }

  // Obtener noticia completa con relaciones
  const newsWithRelations = await prisma.news.findUnique({
    where: { id: newNews.id },
    include: {
      publishedBy: {
        select: {
          id: true,
          name: true,
          lastName: true,
          nickname: true,
          email: true,
          profile_picture: true,
        }
      },
      categories: {
        select: {
          categories: {
            select: {
              id: true,
              name: true
            }
          }
        },
      },
    },
  });

  return newsWithRelations;
}
