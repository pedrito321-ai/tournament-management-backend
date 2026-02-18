import { createJsonErrorResponse } from '@/helpers/createJsonErrorResponse';
import { verifyAuth } from '@/libs/auth';
import { applyCorsHeaders, handleCorsOptions } from '@/libs/cors';
import prisma from '@/libs/prisma'
import { categoryCreateSchema } from '@/schemas/category.schema';
import { getCategories } from '@/service/categories';
import { NextRequest, NextResponse } from 'next/server'
import { ValidationError } from 'yup';

export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const skip = Number(searchParams.get('skip'))
    const take = Number(searchParams.get('take') ?? 10)

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

    const { total, categories } = await getCategories({ take, skip });

    return applyCorsHeaders(
      request,
      NextResponse.json({ total, data: categories }),
    );
  } catch {
    return createJsonErrorResponse({ request });
  }
}

// Crear una nueva categoría (solo admin)
export async function POST(request: NextRequest) {
  try {
    // Validar token de acceso
    const auth = verifyAuth(request);
    if (!auth.valid) return auth.response;

    const userRole = auth.decoded?.role;

    // Solo un admin puede crear una categoría
    if (userRole !== 'admin') {
      return createJsonErrorResponse({
        request,
        message: 'Solo los administradores pueden crear una categoría.',
        status: 403,
      });
    }

    // Validar los datos de entrada
    const {
      name,
      description
    } = await categoryCreateSchema.validate((await request.json()))

    // Verificar si la categoría ya existe
    const existingCategory = await prisma.categories.findUnique({ where: { name } })

    if (existingCategory) {
      return createJsonErrorResponse({
        request,
        message: 'El nombre de la categoría ya está en uso.',
        status: 409,
      });
    }

    // Crear categoría
    const newCategory = await prisma.categories.create({
      data: {
        name,
        description
      }
    })

    return applyCorsHeaders(
      request,
      NextResponse.json({
        message: 'Categoría creada correctamente.',
        data: newCategory,
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

    return createJsonErrorResponse({ request });
  }
}