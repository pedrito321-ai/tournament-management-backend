import { type NextRequest, NextResponse } from 'next/server';
import prisma from '@/libs/prisma';
import { verifyAuth } from '@/libs/auth';
import { ValidationError } from 'yup';
import { applyCorsHeaders, handleCorsOptions } from '@/libs/cors';
import { createJsonErrorResponse } from '@/helpers/createJsonErrorResponse';
import { getNewsItem } from '@/service/news/getNewsItem.service';
import { newsUpdateSchema } from '@/schemas/news.schema';
import { updateNewsService } from '@/service/news/updateNews.service';

// Maneja la preflight request para CORS
export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const numericId = Number(id);

    if (isNaN(numericId)) {
      return createJsonErrorResponse({
        request,
        message: 'ID debe ser un número válido.',
        status: 400,
      });
    }

    // Bucar noticia
    const newsItem = await getNewsItem({ id: +id });

    if (!newsItem) {
      return createJsonErrorResponse({
        request,
        message: `La noticia con ID ${numericId} no existe`,
        status: 404,
      });
    }

    return applyCorsHeaders(request, NextResponse.json(newsItem));
  } catch (error) {
    if (error instanceof Error) {
      return createJsonErrorResponse({
        request,
        message: error.message,
        status: 500,
      });
    }

    // Error genérico
    return createJsonErrorResponse({ request });
  }
}

// Eliminar noticia (solo admin)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verificar token
    const auth = verifyAuth(request);
    if (!auth.valid) return auth.response;

    // Verificar rol
    const authUserRole = auth.decoded?.role;

    if (authUserRole !== 'admin') {
      return createJsonErrorResponse({
        request,
        message: 'Solo los administradores pueden eliminar noticias.',
        status: 403,
      });
    }

    const { id } = await params;
    const numericId = Number(id);

    if (isNaN(numericId)) {
      return createJsonErrorResponse({
        request,
        message: 'ID debe ser un número válido.',
        status: 400,
      });
    }

    // Verificar si la noticia ya existe
    const existingNews = await prisma.news.findUnique({
      where: { id: numericId },
    });

    if (!existingNews) {
      return createJsonErrorResponse({
        request,
        message: `La noticia con ID ${numericId} no existe.`,
        status: 400,
      });
    }

    // Eliminar noticia
    await prisma.news.delete({ where: { id: numericId } });

    return applyCorsHeaders(
      request,
      NextResponse.json({
        message: `La noticia con ID ${numericId} eliminado correctamente.`,
      })
    );
  } catch {
    // Error genérico
    return createJsonErrorResponse({ request });
  }
}

// Actualizar noticia (solo admin)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verificar token 
    const auth = verifyAuth(request);
    if (!auth.valid) return auth.response;

    // Verificar rol
    const authUserRole = auth.decoded?.role;

    if (authUserRole !== 'admin') {
      return createJsonErrorResponse({
        request,
        message: 'Solo los administradores pueden actualizar noticias.',
        status: 403,
      });
    }

    // Validar el ID de la noticia desde los parámetros
    const { id } = await params;
    const numericId = Number(id);

    if (isNaN(numericId)) {
      return createJsonErrorResponse({
        request,
        message: 'ID debe ser un número válido.',
        status: 400,
      });
    }

    // Verificar si la noticia existe
    const existingNews = await prisma.news.findUnique({
      where: { id: numericId },
    });

    if (!existingNews) {
      return createJsonErrorResponse({
        request,
        message: `La noticia con ID ${numericId} no existe.`,
        status: 400,
      });
    }

    // Validar los datos de entrada
    const validatedData = await newsUpdateSchema.validate(await request.json());

    // Limpiar los datos, eliminando posibles valores undefined en categories
    const cleanedData = {
      ...validatedData,
      categories:
        validatedData.categories?.filter((v): v is number => v !== undefined) ??
        null,
    };

    // Actualizar la noticia en la BD usando el servicio
    const updatedNews = await updateNewsService({
      newsId: numericId,
      payload: cleanedData,
      currentNews: existingNews,
    });

    return applyCorsHeaders(request, 
      NextResponse.json({
        message: `La noticia con ID ${numericId} actualizado correctamente.`,
        data: updatedNews,
      })
    );
  } catch (error) {
    if (error instanceof ValidationError) {
      return createJsonErrorResponse({
        request,
        message: error.errors.join(', '),
        status: 400,
      });
    }

    // Error genérico del servidor
    return createJsonErrorResponse({ request });
  }
}
