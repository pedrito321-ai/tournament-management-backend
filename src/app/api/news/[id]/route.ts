import { type NextRequest, NextResponse } from 'next/server';
import prisma from '@/libs/prisma';
import { verifyAuth } from '@/libs/auth';
import { news } from '@prisma/client';
import { ValidationError } from 'yup';
import { newsUpdateSchema } from '@/schemas/newsItem.schema';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const numericId = Number(id);

    if (isNaN(numericId)) {
      return NextResponse.json(
        { error: 'ID debe ser un número válido.' },
        { status: 400 }
      );
    }

    // Bucar noticia
    const news = await prisma.news.findFirst({
      where: { id: numericId },
      include: {
        users: {
          select: {
            name: true,
            email: true,
            nickname: true,
          },
        },
      },
    });

    if (!news) {
      return NextResponse.json(
        { error: `El ID ${numericId} no existe` },
        { status: 404 }
      );
    }

    return NextResponse.json(news);
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { error: 'Error interno del servidor. Inténtalo más tarde.' },
      { status: 500 }
    );
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
    const userRole = auth.decoded?.role;
    if (userRole !== 'admin') {
      return NextResponse.json(
        { error: 'Solo los administradores pueden eliminar noticias.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const numericId = Number(id);

    if (isNaN(numericId)) {
      return NextResponse.json(
        { error: 'ID debe ser un número válido.' },
        { status: 400 }
      );
    }

    // Verificar si la noticia ya existe
    const existingNews = await prisma.news.findUnique({
      where: { id: numericId },
    });

    if (!existingNews) {
      return NextResponse.json(
        { error: `La noticia con ID ${numericId} no existe.` },
        { status: 400 }
      );
    }

    // Eliminar noticia
    await prisma.news.delete({
      where: { id: numericId },
    });

    return NextResponse.json({
      message: `La noticia con ID ${numericId} eliminado correctamente.`,
    });
  } catch {
    return NextResponse.json(
      { error: 'Error interno del servidor al eliminar la noticia.' },
      { status: 500 }
    );
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
    const userRole = auth.decoded?.role;
    if (userRole !== 'admin') {
      return NextResponse.json(
        { error: 'Solo los administradores pueden actualizar noticias.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const numericId = Number(id);

    if (isNaN(numericId)) {
      return NextResponse.json(
        { error: 'ID debe ser un número válido.' },
        { status: 400 }
      );
    }

    // Verificar si la noticia existe
    const existingNews = await prisma.news.findUnique({
      where: { id: numericId },
    });

    if (!existingNews) {
      return NextResponse.json(
        { error: `La noticia con ID ${numericId} no existe.` },
        { status: 400 }
      );
    }

    // Validar los datos de entrada
    const { content, image_url, source, title } =
      await newsUpdateSchema.validate(await request.json());

    // Preparar datos para actualizar
    const dataToUpdate: Partial<Omit<news, 'created_at' | 'updated_at'>> = {};

    // Agregar campos si se proporcionan
    if (content) dataToUpdate.content = content;
    if (image_url) dataToUpdate.image_url = image_url;
    if (source) dataToUpdate.source = source;
    if (title) dataToUpdate.title = title;

    // Actualizar notiica
    const newsUpdate = await prisma.news.update({
      where: { id: numericId },
      data: dataToUpdate,
    });

    return NextResponse.json({
      message: `La noticia con ID ${numericId} actualizado correctamente.`,
      data: newsUpdate,
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ errors: error.errors }, { status: 400 });
    }

    return NextResponse.json(
      { error: 'Error interno del servidor al actualizar la noticia.' },
      { status: 500 }
    );
  }
}
