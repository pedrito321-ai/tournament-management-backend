import prisma from '@/libs/prisma';
import { news } from '@prisma/client';

interface NewsUpdatePayload {
  title?: string;
  content?: string;
  image_url?: string | null;
  source_name?: string | null;
  source_link?: string | null;
  source_logo_url?: string | null;
  categories?: number[] | null;
}

interface UpdateNewsParams {
  newsId: number;
  payload: NewsUpdatePayload;
  currentNews: news;
}

function resolveUpdatableString(
  incoming: string | null | undefined,
  current: string | null
): string | null {
  if (incoming === undefined) return current;
  if (incoming === null) return '';
  return incoming;
}

export async function updateNewsService({
  newsId,
  payload,
  currentNews,
}: UpdateNewsParams) {
  console.log({
    payload,
    currentNews,
  });

  // Actualizar campos de la noticia
  await prisma.news.update({
    where: { id: newsId },
    data: {
      title: payload.title ?? currentNews.title,
      content: payload.content ?? currentNews.content,
      image_url: resolveUpdatableString(
        payload.image_url,
        currentNews.image_url
      ),
      source_name: resolveUpdatableString(
        payload.source_name,
        currentNews.source_name
      ),
      source_link: resolveUpdatableString(
        payload.source_link,
        currentNews.source_link
      ),
      source_logo_url: resolveUpdatableString(
        payload.source_logo_url,
        currentNews.source_logo_url
      ),
    },
  });

  // Actualizar categorías si vienen
  if (payload.categories) {
    // Eliminar categorías existentes
    await prisma.news_categories.deleteMany({
      where: { news_id: newsId },
    });

    // Insertar nuevas categorías
    if (payload.categories.length > 0) {
      await prisma.news_categories.createMany({
        data: payload.categories.map((categoryId) => ({
          news_id: newsId,
          category_id: categoryId,
        })),
      });
    }
  }

  // Devolver noticia completa con relaciones
  const newsWithRelations = await prisma.news.findUnique({
    where: { id: newsId },
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

  return newsWithRelations;
}
