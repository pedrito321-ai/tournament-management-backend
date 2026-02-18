import { createJsonErrorResponse } from '@/helpers/createJsonErrorResponse';
import { verifyAuth } from '@/libs/auth';
import { applyCorsHeaders, handleCorsOptions } from '@/libs/cors';
import prisma from '@/libs/prisma';
import { newsCreateSchema } from '@/schemas/news.schema';
import { createNews } from '@/service/news/createNews.service';
import { getNews } from '@/service/news/getNews.service';
import { NextRequest, NextResponse } from 'next/server';
import { ValidationError } from 'yup';

// Maneja la preflight request para CORS
export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const skip = Number(searchParams.get('skip'));
    const take = Number(searchParams.get('take') ?? 10);

    if (isNaN(skip) || skip < 0) {
      return createJsonErrorResponse({
        request,
        message: 'skip debe ser un número válido mayor o igual a 0.',
        status: 400,
      });
    }

    if (isNaN(take) || take < 1) {
      return createJsonErrorResponse({
        request,
        message: 'take debe ser un número válido mayor o igual a 1.',
        status: 400,
      });
    }

    const news = await getNews({ skip, take });

    return applyCorsHeaders(
      request,
      NextResponse.json({
        total: news.length,
        data: news,
      }),
    );
  } catch {
    return createJsonErrorResponse({ request });
  }
}

// Crear noticia (solo admin)
export async function POST(request: NextRequest) {
  try {
    // Verificar token
    const auth = verifyAuth(request);
    if (!auth.valid) return auth.response;

    const authUserRole = auth.decoded?.role;
    const authUserId = auth.decoded?.id;

    // Solo un admin puede crear una noticia
    if (authUserRole !== 'admin') {
      return createJsonErrorResponse({
        request,
        message: 'Solo los administradores pueden crear una noticia.',
        status: 403,
      });
    }

    // Validar datos
    const {
      title,
      content,
      image_url,
      source_name,
      source_link,
      source_logo_url,
      categories: rawCategories,
    } = await newsCreateSchema.validate(await request.json());

    // Validación de categorías
    if (rawCategories) {
      for (const categoryId of rawCategories) {
        const categoryExists = await prisma.categories.findUnique({
          where: { id: categoryId },
        });

        if (!categoryExists) {
          return createJsonErrorResponse({
            request,
            message: `Categoría con ID ${categoryId} no existe.`,
            status: 400,
          });
        }
      }
    }

    // Normalizamos categories
    const categories =
      rawCategories?.filter((v): v is number => v !== undefined) ?? undefined;

    const newsWithRelations = await createNews({
      title,
      content,
      image_url,
      source_name,
      source_link,
      source_logo_url,
      categories,
      publishedById: Number(authUserId),
    });

    return applyCorsHeaders(
      request,
      NextResponse.json({
        message: 'Noticia creada correctamente.',
        data: newsWithRelations,
      }),
    );
  } catch (error) {
    if (error instanceof ValidationError) {
      return createJsonErrorResponse({
        request,
        message: error.errors.join(', '),
        status: 400,
      });
    }

    // Error genérico
    return createJsonErrorResponse({ request });
  }
}