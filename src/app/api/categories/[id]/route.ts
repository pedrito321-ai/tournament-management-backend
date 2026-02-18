import { type NextRequest, NextResponse } from 'next/server'
import prisma from '@/libs/prisma'
import { verifyAuth } from '@/libs/auth';
import { categories } from '@prisma/client';
import { ValidationError } from 'yup';
import { categoryUpdateSchema } from '@/schemas/category.schema';
import { getCategory } from '@/service/categories';
import { applyCorsHeaders, handleCorsOptions } from '@/libs/cors';
import { createJsonErrorResponse } from '@/helpers/createJsonErrorResponse';

export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params

    const numericId = Number(id)

    if (isNaN(numericId)) {
      return createJsonErrorResponse({
        request,
        message: 'ID debe ser un número válido.',
        status: 400,
      });
    }

    // Bucar categoría
    const category = await getCategory({ numericId });

    if (!category) {
      return createJsonErrorResponse({
        request,
        message: `La categoría con ID ${numericId} no existe`,
        status: 404,
      });
    }

    return applyCorsHeaders(request, NextResponse.json(category));
  } catch {
    return createJsonErrorResponse({ request });
  }
}

// Eliminar una categoría (solo admin)
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
      return createJsonErrorResponse({
        request,
        message: 'Solo los administradores pueden eliminar una categoría.',
        status: 403,
      });
    }

    const { id } = await params
    const numericId = Number(id)

    if (isNaN(numericId)) {
      return createJsonErrorResponse({
        request,
        message: `La categoría con ID ${id} debe ser un número válido.`,
        status: 400,
      });
    }

    // Verificar si la categoría ya existe
    const existingCategory = await prisma.categories.findUnique({ where: { id: numericId } })

    if (!existingCategory) {
      return createJsonErrorResponse({
        request,
        message: `La categoría con ID ${ numericId } no existe.`,
        status: 400,
      });
    }

    // Eliminar una categoría
    await prisma.categories.delete({
      where: { id: numericId },
    })

    return applyCorsHeaders(
      request,
      NextResponse.json({
        message: `La categoría con ID ${numericId} eliminada correctamente.`,
      })
    );
  } catch {
    return createJsonErrorResponse({ request });
  }
}

// Actualizar una categoría (solo admin)
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
      return createJsonErrorResponse({
        request,
        message: 'Solo los administradores pueden actualizar categorías.',
        status: 403,
      });
    }

    const { id } = await params
    const numericId = Number(id)

    if (isNaN(numericId)) {
      return createJsonErrorResponse({
        request,
        message: `La categoría con ID ${id} debe ser un número válido.`,
        status: 400,
      });
    }

    // Verificar si la categoría ya existe
    const existingCategory = await prisma.categories.findUnique({ where: { id: numericId } })

    if (!existingCategory) {
      return createJsonErrorResponse({
        request,
        message: `La categoría con ID ${ numericId } no existe.`,
        status: 400,
      });
    }

    // Validar los datos de entrada
    const {
      name,
      description
    } = await categoryUpdateSchema.validate((await request.json()))

    /** TODO: Verificar si el nombre de la categoría es distinta a la actual y si ya existe */

    // Preparar datos para actualizar
    const dataToUpdate: Partial<Pick<categories, 'name' | 'description'>> = {}

    // Agregar campos si se proporcionan
    if (name) dataToUpdate.name = name
    if (description) dataToUpdate.description = description

    // Actualizar categoría
    const categoryUpdate = await prisma.categories.update({
      where: { id: numericId },
      data: dataToUpdate,
    })

    return applyCorsHeaders(
      request,
      NextResponse.json({
        message: `La categoría con ID ${numericId} actualizada correctamente.`,
        data: categoryUpdate,
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

    return createJsonErrorResponse({ request });
  }
}